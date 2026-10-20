import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoverWorker } from './covers';

/** A cover job the test finishes by hand; records which books ran and their abort signals. */
function jobs() {
  const runs: { bookId: string; signal: AbortSignal; finish(): void; fail(e: Error): void }[] = [];
  const make = (bookId: string, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      runs.push({ bookId, signal, finish: resolve, fail: reject });
      signal.addEventListener('abort', () => reject(new DOMException('stop', 'AbortError')));
    });
  return { runs, make };
}

describe('CoverWorker', () => {
  afterEach(() => vi.useRealTimers());

  it('starts after the idle delay, then makes covers one after another without waiting', async () => {
    vi.useFakeTimers();
    const { runs, make } = jobs();
    const worker = new CoverWorker(make, { delayMs: 1000 });
    worker.want(['a', 'b']);
    worker.resume();
    await vi.advanceTimersByTimeAsync(999);
    expect(runs).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(runs.map((r) => r.bookId)).toEqual(['a']);
    runs[0]?.finish();
    await vi.advanceTimersByTimeAsync(1);
    expect(runs.map((r) => r.bookId)).toEqual(['a', 'b']);
  });

  it('never runs two jobs at once, nor the same book twice', async () => {
    vi.useFakeTimers();
    const { runs, make } = jobs();
    const worker = new CoverWorker(make, { delayMs: 0 });
    worker.resume();
    worker.want(['a', 'b']);
    await vi.advanceTimersByTimeAsync(1);
    // The shelf changes while "a" is being drawn: asking again must not start anything new.
    worker.want(['a', 'b', 'c']);
    worker.want(['a']);
    await vi.advanceTimersByTimeAsync(5000);
    expect(runs.map((r) => r.bookId)).toEqual(['a']);
    runs[0]?.finish();
    await vi.advanceTimersByTimeAsync(1);
    runs[1]?.finish();
    await vi.advanceTimersByTimeAsync(1);
    runs[2]?.finish();
    await vi.advanceTimersByTimeAsync(1);
    worker.want(['a', 'b', 'c']);
    await vi.advanceTimersByTimeAsync(5000);
    expect(runs.map((r) => r.bookId)).toEqual(['a', 'b', 'c']);
  });

  it('pausing (a book is opening) cancels the job in progress, which runs again on resume', async () => {
    vi.useFakeTimers();
    const { runs, make } = jobs();
    const worker = new CoverWorker(make, { delayMs: 100 });
    worker.want(['a']);
    worker.resume();
    await vi.advanceTimersByTimeAsync(100);
    expect(runs).toHaveLength(1);
    worker.pause();
    expect(runs[0]?.signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(runs).toHaveLength(1);
    worker.resume();
    await vi.advanceTimersByTimeAsync(100);
    expect(runs.map((r) => r.bookId)).toEqual(['a', 'a']);
  });

  it('does not try a failed book again, and reports why', async () => {
    vi.useFakeTimers();
    const { runs, make } = jobs();
    const onError = vi.fn();
    const worker = new CoverWorker(make, { delayMs: 0, onError });
    worker.resume();
    worker.want(['bad', 'good']);
    await vi.advanceTimersByTimeAsync(1);
    runs[0]?.fail(new Error('broken PDF'));
    await vi.advanceTimersByTimeAsync(1);
    runs[1]?.finish();
    await vi.advanceTimersByTimeAsync(1);
    worker.want(['bad', 'good']);
    await vi.advanceTimersByTimeAsync(1000);
    expect(runs.map((r) => r.bookId)).toEqual(['bad', 'good']);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('runs a given job (the cover drawn as the reader closes) as the one job in progress', async () => {
    vi.useFakeTimers();
    const { runs, make } = jobs();
    const worker = new CoverWorker(make, { delayMs: 0 });
    let closing!: () => void;
    let closingSignal: AbortSignal | undefined;
    worker.run('x', (signal) => {
      closingSignal = signal;
      return new Promise<void>((resolve) => (closing = resolve));
    });
    worker.resume();
    worker.want(['x', 'y']);
    await vi.advanceTimersByTimeAsync(10);
    expect(runs).toHaveLength(0);
    // Opening a book cancels it too.
    worker.pause();
    expect(closingSignal?.aborted).toBe(true);
    closing();
    worker.resume();
    await vi.advanceTimersByTimeAsync(10);
    expect(runs.map((r) => r.bookId)).toEqual(['x']);
  });
});
