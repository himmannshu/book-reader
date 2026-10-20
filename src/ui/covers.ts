// Covers for the library shelf (phase 11): page 1 drawn small, as a JPEG. Drawn only while the
// Library shows: from the closing book when going back to it, or in the background.
import type { PdfDoc } from '../engine/types';

/** Cover width in device pixels: sharp at about 120 CSS px wide on a Retina screen. */
const COVER_WIDTH = 240;

export interface DrawnCover {
  bytes: ArrayBuffer;
  type: string;
}

/** Draws page 1 of an open document into a small JPEG. Aborting cancels the drawing. */
export async function drawCover(doc: PdfDoc, signal?: AbortSignal): Promise<DrawnCover> {
  const canvas = document.createElement('canvas');
  try {
    signal?.throwIfAborted();
    const task = doc.renderPage(0, canvas, COVER_WIDTH / doc.firstPageSize.width);
    signal?.addEventListener('abort', () => task.cancel(), { once: true });
    await task.promise;
    signal?.throwIfAborted();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.8),
    );
    if (!blob) throw new Error('The cover could not be encoded');
    return { bytes: await blob.arrayBuffer(), type: blob.type || 'image/jpeg' };
  } finally {
    // Free the backing store at once (Safari keeps it otherwise).
    canvas.width = 0;
    canvas.height = 0;
  }
}

export type CoverJob = (signal: AbortSignal) => Promise<void>;

/**
 * Makes missing covers, one book at a time, only while the Library shows (phase 11, review B1/B2).
 * `resume()` starts after the Library has been idle for `delayMs`; `pause()` (a book is opening)
 * cancels the job in progress, which runs again on the next resume. A book is never queued twice,
 * and one that failed is not tried again this session.
 */
export class CoverWorker {
  readonly #make: (bookId: string, signal: AbortSignal) => Promise<void>;
  readonly #delayMs: number;
  readonly #onError: (error: unknown) => void;
  #queue: string[] = [];
  readonly #done = new Set<string>();
  readonly #failed = new Set<string>();
  #current: { bookId: string; controller: AbortController } | null = null;
  #paused = true;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    make: (bookId: string, signal: AbortSignal) => Promise<void>,
    { delayMs = 1500, onError = (error: unknown) => console.error(error) } = {},
  ) {
    this.#make = make;
    this.#delayMs = delayMs;
    this.#onError = onError;
  }

  /** Books that need a cover. Ones already queued, in progress, made or failed are skipped. */
  want(bookIds: Iterable<string>): void {
    for (const id of bookIds) {
      if (this.#done.has(id) || this.#failed.has(id) || this.#current?.bookId === id) continue;
      if (!this.#queue.includes(id)) this.#queue.push(id);
    }
    if (!this.#paused && !this.#current && this.#timer === undefined) this.#schedule(0);
  }

  /** Runs a job for one book now (the cover drawn from a book as it closes). */
  run(bookId: string, job: CoverJob): void {
    if (this.#current) {
      // Never two at once: leave it to the queue.
      this.want([bookId]);
      return;
    }
    this.#queue = this.#queue.filter((id) => id !== bookId);
    this.#start(bookId, job);
  }

  resume(): void {
    if (!this.#paused) return;
    this.#paused = false;
    if (!this.#current) this.#schedule(this.#delayMs);
  }

  pause(): void {
    this.#paused = true;
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#current?.controller.abort();
  }

  #schedule(delay: number): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      if (this.#paused || this.#current) return;
      const bookId = this.#queue.shift();
      if (bookId !== undefined) this.#start(bookId, (signal) => this.#make(bookId, signal));
    }, delay);
  }

  #start(bookId: string, job: CoverJob): void {
    const controller = new AbortController();
    this.#current = { bookId, controller };
    job(controller.signal)
      .then(
        () => {
          if (controller.signal.aborted) this.#queue.unshift(bookId);
          else this.#done.add(bookId);
        },
        (error: unknown) => {
          if (controller.signal.aborted) {
            this.#queue.unshift(bookId);
            return;
          }
          this.#failed.add(bookId);
          this.#onError(error);
        },
      )
      .finally(() => {
        this.#current = null;
        if (!this.#paused) this.#schedule(0);
      });
  }
}
