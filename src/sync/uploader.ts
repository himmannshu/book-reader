// Copies book files on this device to the cloud (phase 09b), one book and one part at a time.
// Progress is saved after every part, so a dropped connection or a reload resumes from the next
// part. Runs after each sync; reading never waits for it. DOM-free.
import {
  StorageError,
  type BookStore,
  type FileTransferStore,
  type UploadRecord,
} from '../storage/types';
import { FileError, type FileClient } from './file-client';

export type UploadStatus =
  | { state: 'idle' }
  /** `books` still to upload, including the current one; `percent` of the current one. */
  | { state: 'uploading'; books: number; percent: number }
  /** The cloud is at its cap; some books stay on this device only. */
  | { state: 'full' };

export interface UploaderOptions {
  onStatus?(status: UploadStatus): void;
}

/** Errors that stop the whole run: nothing else will work until the situation changes. */
const STOP_ALL = new Set(['offline', 'signed-out', 'unavailable']);

export class Uploader {
  readonly #books: Pick<BookStore, 'getBytes'>;
  readonly #files: FileTransferStore;
  readonly #client: FileClient;
  readonly #options: UploaderOptions;
  #running: Promise<void> | undefined;
  #again = false;

  constructor(
    books: Pick<BookStore, 'getBytes'>,
    files: FileTransferStore,
    client: FileClient,
    options: UploaderOptions = {},
  ) {
    this.#books = books;
    this.#files = files;
    this.#client = client;
    this.#options = options;
  }

  /** Uploads what is pending. If a run is in progress, one more runs right after it. */
  run(): Promise<void> {
    if (this.#running) {
      this.#again = true;
      return this.#running;
    }
    this.#running = (async () => {
      do {
        this.#again = false;
        await this.#once();
      } while (this.#again);
    })().finally(() => {
      this.#running = undefined;
    });
    return this.#running;
  }

  #status(status: UploadStatus): void {
    this.#options.onStatus?.(status);
  }

  async #once(): Promise<void> {
    let full = false;
    try {
      const pending = await this.#files.pendingUploads();
      for (const [index, { book, upload }] of pending.entries()) {
        const remaining = pending.length - index;
        this.#status({ state: 'uploading', books: remaining, percent: 0 });
        try {
          await this.#uploadBook(book.id, upload, remaining);
        } catch (error) {
          if (!(error instanceof FileError)) throw error;
          if (STOP_ALL.has(error.kind)) break;
          if (error.kind === 'storage-full') {
            full = true;
            await this.#files.saveUpload({ bookId: book.id, state: 'full', parts: [] });
          } else if (error.kind === 'failed') {
            console.error('Uploading a book failed', error);
          }
          // not-synced: the next sync sends the book first; deleted: nothing to do.
        }
      }
    } catch (error) {
      console.error('Uploading books failed', error);
    }
    this.#status(full ? { state: 'full' } : { state: 'idle' });
  }

  async #uploadBook(bookId: string, saved: UploadRecord | undefined, remaining: number) {
    let bytes: Uint8Array;
    try {
      bytes = await this.#books.getBytes(bookId);
    } catch (error) {
      // Removed from this device meanwhile: nothing to upload.
      if (error instanceof StorageError && error.kind === 'not-found') return;
      throw error;
    }
    let record =
      saved?.state === 'uploading' && saved.uploadId && saved.partSize ? saved : undefined;
    for (let attempt = 0; ; attempt++) {
      if (!record) {
        const started = await this.#client.startUpload(bookId, bytes.length);
        if ('done' in started) {
          await this.#files.saveUpload({ bookId, state: 'done', parts: [] });
          return;
        }
        record = {
          bookId,
          state: 'uploading',
          uploadId: started.uploadId,
          partSize: started.partSize,
          parts: [],
        };
        await this.#files.saveUpload(record);
      }
      try {
        await this.#sendParts(record, bytes, remaining);
        return;
      } catch (error) {
        // The cloud forgot the upload (it expires after a week): start over, once.
        if (error instanceof FileError && error.kind === 'no-such-upload' && attempt === 0) {
          record = undefined;
          continue;
        }
        throw error;
      }
    }
  }

  async #sendParts(record: UploadRecord, bytes: Uint8Array, remaining: number) {
    const { bookId, uploadId = '', partSize = 1 } = record;
    const count = Math.max(1, Math.ceil(bytes.length / partSize));
    const parts = [...record.parts];
    const sent = new Set(parts.map((p) => p.partNumber));
    for (let n = 1; n <= count; n++) {
      if (sent.has(n)) continue;
      const part = await this.#client.uploadPart(
        bookId,
        uploadId,
        n,
        bytes.subarray((n - 1) * partSize, n * partSize),
      );
      parts.push(part);
      await this.#files.saveUpload({ ...record, parts });
      this.#status({
        state: 'uploading',
        books: remaining,
        percent: Math.round((parts.length / count) * 100),
      });
    }
    parts.sort((a, b) => a.partNumber - b.partNumber);
    await this.#client.completeUpload(bookId, uploadId, parts);
    await this.#files.saveUpload({ bookId, state: 'done', parts: [] });
  }
}
