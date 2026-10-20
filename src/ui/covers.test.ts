import { afterEach, describe, expect, it, vi } from 'vitest';
import { startCoverQueue } from './covers';

describe('startCoverQueue', () => {
  afterEach(() => vi.useRealTimers());

  it('waits for the idle delay, then makes covers one at a time', async () => {
    vi.useFakeTimers();
    const running: string[] = [];
    let busy = 0;
    let maxBusy = 0;
    const finish: (() => void)[] = [];
    startCoverQueue(
      ['a', 'b', 'c'],
      (id) => {
        running.push(id);
        busy++;
        maxBusy = Math.max(maxBusy, busy);
        return new Promise<void>((resolve) =>
          finish.push(() => {
            busy--;
            resolve();
          }),
        );
      },
      { delayMs: 1000 },
    );
    await vi.advanceTimersByTimeAsync(999);
    expect(running).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(running).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(5000);
    expect(running).toEqual(['a']);
    finish.shift()?.();
    await vi.advanceTimersByTimeAsync(1);
    expect(running).toEqual(['a', 'b']);
    finish.shift()?.();
    await vi.advanceTimersByTimeAsync(1);
    finish.shift()?.();
    await vi.advanceTimersByTimeAsync(1);
    expect(running).toEqual(['a', 'b', 'c']);
    expect(maxBusy).toBe(1);
  });

  it('stops after the book in progress, and before starting if stopped early', async () => {
    vi.useFakeTimers();
    const made: string[] = [];
    const early = startCoverQueue(['x'], async (id) => void made.push(id), { delayMs: 10 });
    early.stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(made).toEqual([]);

    let release = () => {};
    const queue = startCoverQueue(
      ['a', 'b'],
      (id) => {
        made.push(id);
        return new Promise<void>((resolve) => (release = resolve));
      },
      { delayMs: 10 },
    );
    await vi.advanceTimersByTimeAsync(10);
    queue.stop();
    release();
    await vi.advanceTimersByTimeAsync(100);
    expect(made).toEqual(['a']);
  });

  it('reports a failed cover and goes on with the next book', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const made: string[] = [];
    startCoverQueue(
      ['bad', 'good'],
      async (id) => {
        if (id === 'bad') throw new Error('broken PDF');
        made.push(id);
      },
      { delayMs: 0, onError },
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(made).toEqual(['good']);
  });
});
