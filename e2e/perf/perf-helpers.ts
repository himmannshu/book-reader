import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';

const root = join(import.meta.dirname, '..', '..');

export const heavyFixturePath = join(root, 'tests', 'fixtures', 'generated', 'heavy-600-v1.pdf');

/** A user's own book (never copied into the repo) or the generated heavy book. */
export const ownBook = process.env.PERF_BOOK;
export const bookPath = ownBook ?? heavyFixturePath;

/** Report-only runs measure without enforcing budgets: own books and baseline measurement. */
export const reportOnly = !!ownBook || process.env.PERF_REPORT_ONLY === '1';

export type Metric = 'firstPageMs' | 'jumpMs' | 'p95FrameMs' | 'blankFramePct' | 'maxCanvasMB';
const timeMetrics: ReadonlySet<Metric> = new Set(['firstPageMs', 'jumpMs', 'p95FrameMs']);

interface Budgets {
  ciTimeMultiplier: number;
  /** Projects whose budgets CI enforces; others are measured and reported only. */
  ciEnforcedProjects: string[];
  [project: string]: unknown;
}
const budgets = JSON.parse(
  readFileSync(join(import.meta.dirname, 'budgets.json'), 'utf8'),
) as Budgets;

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] ?? NaN)
    : ((sorted[mid - 1] ?? NaN) + (sorted[mid] ?? NaN)) / 2;
}

/**
 * Writes the measurement to perf-results/ and, unless report-only, checks it against its budget.
 * A miss marks the test failed but lets the remaining measurements run.
 */
export function record(
  testInfo: TestInfo,
  metric: Metric,
  value: number,
  samples: number[] = [],
): void {
  const project = testInfo.project.name;
  const dir = join(root, 'perf-results', ownBook ? 'own-book' : 'heavy');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${project}.${metric}.json`),
    JSON.stringify({
      project,
      metric,
      value,
      samples,
      book: ownBook ? 'own book' : 'heavy-600-v1',
    }) + '\n',
  );
  testInfo.annotations.push({ type: metric, description: String(value) });
  if (reportOnly) return;
  if (process.env.CI && !budgets.ciEnforcedProjects.includes(project)) {
    testInfo.annotations.push({ type: 'not enforced in CI', description: metric });
    return;
  }

  const projectBudgets = budgets[project] as Partial<Record<Metric, number>> | undefined;
  const base = projectBudgets?.[metric];
  if (base === undefined) throw new Error(`No budget for ${metric} in project ${project}`);
  const limit = process.env.CI && timeMetrics.has(metric) ? base * budgets.ciTimeMultiplier : base;
  // Soft, so every metric in a test is still recorded when an earlier one is over budget.
  expect
    .soft(value, `${metric} = ${value} exceeds budget ${limit} (${project})`)
    .toBeLessThanOrEqual(limit);
}

/** Opens the benchmark book through the app's file input; returns ms from choice to page 1 drawn. */
export async function openBook(page: Page): Promise<number> {
  await page.goto('/');
  await page.getByLabel('Open PDF').setInputFiles(bookPath);
  await expect(page.locator('[data-page-index="0"]')).toHaveAttribute('data-state', 'rendered', {
    timeout: 60_000,
  });
  return page.evaluate(() => {
    const start = performance.getEntriesByName('book:open-start')[0];
    const first = performance
      .getEntriesByName('page:rendered')
      .find((m) => (m as PerformanceMark).detail?.pageIndex === 0);
    if (!start || !first) throw new Error('missing timing marks');
    return first.startTime - start.startTime;
  });
}

export async function pageCount(page: Page): Promise<number> {
  return page.locator('[data-page-index]').count();
}

/** Scrolls straight to `index` and returns ms until that page is drawn. */
export async function jumpTo(page: Page, index: number): Promise<number> {
  return page.getByTestId('reader').evaluate(async (scroller, target) => {
    const slot = scroller.querySelector<HTMLElement>(`[data-page-index="${target}"]`);
    if (!slot) throw new Error(`no page ${target}`);
    const t0 = performance.now();
    scroller.scrollTop = slot.offsetTop;
    const deadline = t0 + 30_000;
    for (;;) {
      const mark = performance
        .getEntriesByName('page:rendered')
        .find((m) => m.startTime >= t0 && (m as PerformanceMark).detail?.pageIndex === target);
      if (mark) return mark.startTime - t0;
      if (performance.now() > deadline) throw new Error(`page ${target} never drew`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }, index);
}

/**
 * Scrolls steadily for `durationMs` at `pxPerSecond` and records the time between frames and
 * how many frames showed a blank (not yet drawn) page inside the viewport.
 */
export async function steadyScroll(
  page: Page,
  durationMs: number,
  pxPerSecond: number,
): Promise<{ p95FrameMs: number; blankFramePct: number; frames: number }> {
  return page.getByTestId('reader').evaluate(
    async (scroller, { durationMs, pxPerSecond }) => {
      const slots = [...scroller.querySelectorAll<HTMLElement>('[data-page-index]')];
      const boxes = slots.map((s) => ({ top: s.offsetTop, bottom: s.offsetTop + s.offsetHeight }));
      const intervals: number[] = [];
      let blank = 0;
      let frames = 0;
      let last = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      const end = last + durationMs;
      while (last < end) {
        const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
        intervals.push(now - last);
        scroller.scrollTop += ((now - last) / 1000) * pxPerSecond;
        last = now;
        frames++;
        const top = scroller.scrollTop;
        const bottom = top + scroller.clientHeight;
        const anyBlank = boxes.some(
          (b, i) => b.bottom > top && b.top < bottom && slots[i]?.dataset.state !== 'rendered',
        );
        if (anyBlank) blank++;
      }
      intervals.sort((a, b) => a - b);
      const p95 =
        intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95))] ?? 0;
      return { p95FrameMs: p95, blankFramePct: (blank / Math.max(frames, 1)) * 100, frames };
    },
    { durationMs, pxPerSecond },
  );
}

/**
 * Visits `stops` positions spread evenly from the first page to the last, letting drawing settle
 * at each, and returns the largest total canvas size seen, in MB.
 */
export async function maxCanvasMemoryMB(page: Page, stops: number): Promise<number> {
  return page.getByTestId('reader').evaluate(async (scroller, stops) => {
    const canvasBytes = () =>
      [...scroller.querySelectorAll('canvas')].reduce((sum, c) => sum + c.width * c.height * 4, 0);
    const settle = async () => {
      const until = performance.now() + 1000;
      while (scroller.querySelector('[data-state="rendering"]') && performance.now() < until) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    let max = 0;
    const maxTop = scroller.scrollHeight - scroller.clientHeight;
    for (let i = 0; i <= stops; i++) {
      scroller.scrollTop = (maxTop * i) / stops;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      max = Math.max(max, canvasBytes());
      await settle();
      max = Math.max(max, canvasBytes());
    }
    return max / 1e6;
  }, stops);
}
