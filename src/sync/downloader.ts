// Downloads a book's file from the cloud (phase 09b) in ranges, with progress, and keeps it only
// if its SHA-256 matches the book id (the server never hashes; see functions/_lib/files.ts).
// DOM-free.
import { FileError, type FileClient } from './file-client';

export interface DownloadOptions {
  /** Bytes per request; defaults to the upload part size. */
  chunkSize?: number;
  onProgress?(received: number, total: number): void;
  signal?: AbortSignal;
  /** Tries per range before giving up. */
  attempts?: number;
  /** Pause before a retry; tests skip it. */
  wait?(ms: number): Promise<void>;
}

export const DOWNLOAD_CHUNK = 8 * 1024 * 1024;
/** Worth another try: the network blipped or the server hiccupped. */
const RETRY = new Set(['offline', 'failed']);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function downloadBook(
  bookId: string,
  client: FileClient,
  options: DownloadOptions = {},
): Promise<Uint8Array> {
  const chunk = options.chunkSize ?? DOWNLOAD_CHUNK;
  const attempts = options.attempts ?? 3;
  const wait = options.wait ?? sleep;

  async function range(offset: number) {
    for (let attempt = 1; ; attempt++) {
      options.signal?.throwIfAborted();
      try {
        return await client.downloadRange(bookId, offset, chunk, options.signal);
      } catch (error) {
        const retry = error instanceof FileError && RETRY.has(error.kind) && attempt < attempts;
        if (!retry) throw error;
        await wait(500 * attempt);
      }
    }
  }

  const first = await range(0);
  const total = first.total;
  const data = new Uint8Array(total);
  data.set(first.bytes, 0);
  let received = first.bytes.length;
  options.onProgress?.(received, total);
  while (received < total) {
    options.signal?.throwIfAborted();
    const next = await range(received);
    if (next.total !== total || next.bytes.length === 0) {
      throw new FileError('failed', 'The file changed while downloading');
    }
    data.set(next.bytes, received);
    received += next.bytes.length;
    options.onProgress?.(received, total);
  }
  if ((await sha256Hex(data)) !== bookId) {
    throw new FileError('damaged', 'The downloaded file does not match the book');
  }
  return data;
}
