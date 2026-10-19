// User Timing marks for profiling (DevTools) and the phase 02 benchmarks (e2e/perf).
// Marks are cleared whenever a new book starts opening, so they never grow across books.

export const PerfMark = {
  openStart: 'book:open-start',
  opened: 'book:opened',
  pageRendered: 'page:rendered',
} as const;

export interface PageRenderedDetail {
  pageIndex: number;
}

export function markOpenStart(): void {
  for (const name of Object.values(PerfMark)) performance.clearMarks(name);
  performance.mark(PerfMark.openStart);
}

export function markOpened(): void {
  performance.mark(PerfMark.opened);
}

export function markPageRendered(pageIndex: number): void {
  const detail: PageRenderedDetail = { pageIndex };
  performance.mark(PerfMark.pageRendered, { detail });
}
