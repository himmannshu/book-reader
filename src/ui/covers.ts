// Covers for the library shelf (phase 11): page 1 drawn small, as a JPEG. Drawn only when no book
// is being read: when a reader closes, or in the background while the Library shows.
import type { PdfDoc } from '../engine/types';

/** Cover width in device pixels: sharp at about 120 CSS px wide on a Retina screen. */
const COVER_WIDTH = 240;

export interface DrawnCover {
  bytes: ArrayBuffer;
  type: string;
}

/** Draws page 1 of an open document into a small JPEG. */
export async function drawCover(doc: PdfDoc): Promise<DrawnCover> {
  const canvas = document.createElement('canvas');
  try {
    await doc.renderPage(0, canvas, COVER_WIDTH / doc.firstPageSize.width).promise;
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

/**
 * Makes missing covers one book at a time, after the Library has been idle for `delayMs`.
 * `stop()` ends the queue after the book in progress (a started job always finishes cleanly).
 */
export function startCoverQueue(
  bookIds: readonly string[],
  makeCover: (bookId: string) => Promise<void>,
  { delayMs = 1500, onError = (error: unknown) => console.error(error) } = {},
): { stop(): void } {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue = [...bookIds];
  const next = () => {
    timer = undefined;
    const bookId = queue.shift();
    if (stopped || bookId === undefined) return;
    makeCover(bookId)
      .catch((error: unknown) => onError(error))
      .finally(() => {
        if (!stopped) timer = setTimeout(next, 0);
      });
  };
  if (queue.length > 0) timer = setTimeout(next, delayMs);
  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
