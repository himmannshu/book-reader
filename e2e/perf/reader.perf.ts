import { test } from '@playwright/test';
import {
  jumpTo,
  maxCanvasMemoryMB,
  median,
  openBook,
  pageCount,
  record,
  steadyScroll,
} from './perf-helpers';

const RUNS = 3;

test('time to first page', async ({ page }, testInfo) => {
  await openBook(page); // warm-up: caches, JIT, worker start
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) samples.push(await openBook(page));
  record(testInfo, 'firstPageMs', Math.round(median(samples)), samples.map(Math.round));
});

test('jump to a far page', async ({ page }, testInfo) => {
  await openBook(page);
  const count = await pageCount(page);
  const targets = [0.9, 0.5, 0.75].map((f) => Math.floor(count * f));
  await jumpTo(page, Math.floor(count * 0.25)); // warm-up
  const samples: number[] = [];
  for (const target of targets) samples.push(await jumpTo(page, target));
  record(testInfo, 'jumpMs', Math.round(median(samples)), samples.map(Math.round));
});

test('steady scrolling', async ({ page }, testInfo) => {
  await openBook(page);
  const count = await pageCount(page);
  // Median of 3 scrolls from different places, like the other timings: one scroll alone varies
  // by about ±5 ms in WebKit, enough to cross the budget at random.
  const p95s: number[] = [];
  const blanks: number[] = [];
  for (const start of [0.2, 0.45, 0.7]) {
    await jumpTo(page, Math.floor(count * start));
    // About three viewports per second: a brisk reading flick.
    const result = await steadyScroll(page, 3000, 2000);
    p95s.push(Math.round(result.p95FrameMs * 10) / 10);
    blanks.push(Math.round(result.blankFramePct * 10) / 10);
  }
  record(testInfo, 'p95FrameMs', median(p95s), p95s);
  record(testInfo, 'blankFramePct', median(blanks), blanks);
});

test('canvas memory while scrolling the whole book', async ({ page }, testInfo) => {
  await openBook(page);
  const mb = await maxCanvasMemoryMB(page, 30);
  record(testInfo, 'maxCanvasMB', Math.round(mb * 10) / 10);
});
