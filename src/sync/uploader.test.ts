// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { createIndexedDBStores } from '../storage/indexeddb-book-store';
import { StorageError } from '../storage/types';
import { FileError, type FileClient, type FileErrorKind, type UploadedPart } from './file-client';
import { Uploader, type UploadStatus } from './uploader';

/** An in-memory cloud with tiny parts, so a few bytes make a multi-part upload. */
function fakeCloud(partSize = 4) {
  const files = new Map<string, Uint8Array>();
  const uploads = new Map<string, { bookId: string; parts: Map<number, Uint8Array> }>();
  let next = 0;
  const calls: string[] = [];
  /** Throws once for the given call, e.g. 'part:2'. */
  const failures = new Map<string, FileErrorKind>();
  let refuse: FileErrorKind | undefined;

  function maybeFail(call: string) {
    calls.push(call);
    if (refuse) throw new FileError(refuse, refuse);
    const kind = failures.get(call);
    if (kind) {
      failures.delete(call);
      throw new FileError(kind, kind);
    }
  }

  const client: FileClient = {
    async startUpload(bookId, size) {
      maybeFail('start');
      expect(size).toBeGreaterThan(0);
      if (files.has(bookId)) return { done: true };
      const uploadId = `u${++next}`;
      uploads.set(uploadId, { bookId, parts: new Map() });
      return { uploadId, partSize };
    },
    async uploadPart(bookId, uploadId, partNumber, bytes) {
      maybeFail(`part:${partNumber}`);
      const upload = uploads.get(uploadId);
      if (!upload || upload.bookId !== bookId) throw new FileError('no-such-upload', 'gone');
      expect(bytes.length).toBeLessThanOrEqual(partSize);
      upload.parts.set(partNumber, bytes.slice());
      return { partNumber, etag: `e${partNumber}` };
    },
    async completeUpload(bookId, uploadId, parts: UploadedPart[]) {
      maybeFail('complete');
      const upload = uploads.get(uploadId);
      if (!upload) throw new FileError('no-such-upload', 'gone');
      const chunks = parts.map((p) => upload.parts.get(p.partNumber) ?? new Uint8Array());
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const data = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
      files.set(bookId, data);
      uploads.delete(uploadId);
    },
    async downloadRange() {
      throw new Error('not used');
    },
  };
  return {
    client,
    files,
    calls,
    failOnce: (call: string, kind: FileErrorKind) => failures.set(call, kind),
    refuseAll: (kind: FileErrorKind | undefined) => {
      refuse = kind;
    },
    forgetUploads: () => uploads.clear(),
  };
}

function setup(factory = new IDBFactory()) {
  let clock = 1_000;
  return createIndexedDBStores({
    factory,
    now: () => ++clock,
    requestPersistence: async () => true,
  });
}

const pdf = (text: string) => new Blob([`%PDF-${text}`]);

function uploader(s: ReturnType<typeof setup>, client: FileClient) {
  const statuses: UploadStatus[] = [];
  const up = new Uploader(s.books, s.files, client, { onStatus: (st) => statuses.push(st) });
  return { up, statuses };
}

const text = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);

describe('Uploader', () => {
  it('uploads each local book in parts and then leaves it alone', async () => {
    const s = setup();
    const cloud = fakeCloud();
    const a = await s.books.add(pdf('first book'), 'a.pdf');
    const b = await s.books.add(pdf('second'), 'b.pdf');
    const { up, statuses } = uploader(s, cloud.client);

    await up.run();
    expect(text(cloud.files.get(a.id))).toBe('%PDF-first book');
    expect(text(cloud.files.get(b.id))).toBe('%PDF-second');
    expect(await s.files.pendingUploads()).toEqual([]);
    expect(statuses.at(-1)).toEqual({ state: 'idle' });
    expect(statuses).toContainEqual(expect.objectContaining({ state: 'uploading', books: 2 }));

    cloud.calls.length = 0;
    await up.run();
    expect(cloud.calls).toEqual([]);
  });

  it('resumes an interrupted upload from the next part', async () => {
    const s = setup();
    const cloud = fakeCloud();
    const a = await s.books.add(pdf('0123456789ab'), 'a.pdf'); // 17 bytes → 5 parts of 4
    cloud.failOnce('part:3', 'offline');
    const { up, statuses } = uploader(s, cloud.client);

    await up.run();
    expect(statuses.at(-1)).toEqual({ state: 'idle' });
    expect(cloud.files.has(a.id)).toBe(false);
    const saved = (await s.files.pendingUploads())[0]?.upload;
    expect(saved?.parts.map((p) => p.partNumber)).toEqual([1, 2]);

    cloud.calls.length = 0;
    // A fresh uploader, as after a reload: progress comes from storage.
    await uploader(s, cloud.client).up.run();
    expect(cloud.calls).toEqual(['part:3', 'part:4', 'part:5', 'complete']);
    expect(text(cloud.files.get(a.id))).toBe('%PDF-0123456789ab');
  });

  it('starts again when the cloud has forgotten the upload', async () => {
    const s = setup();
    const cloud = fakeCloud();
    const a = await s.books.add(pdf('0123456789'), 'a.pdf');
    cloud.failOnce('part:2', 'offline');
    await uploader(s, cloud.client).up.run();
    cloud.forgetUploads(); // Expired (R2 drops unfinished uploads after a week).

    await uploader(s, cloud.client).up.run();
    expect(text(cloud.files.get(a.id))).toBe('%PDF-0123456789');
  });

  it('marks the cloud as full and keeps the book here', async () => {
    const s = setup();
    const cloud = fakeCloud();
    const a = await s.books.add(pdf('big'), 'a.pdf');
    cloud.failOnce('start', 'storage-full');
    const { up, statuses } = uploader(s, cloud.client);

    await up.run();
    expect(statuses.at(-1)).toEqual({ state: 'full' });
    expect((await s.files.pendingUploads())[0]?.upload?.state).toBe('full');
    expect(Array.from(await s.books.getBytes(a.id)).length).toBeGreaterThan(0);

    // Once there's room again (a book deleted elsewhere), it uploads.
    await up.run();
    expect(cloud.files.has(a.id)).toBe(true);
    expect(statuses.at(-1)).toEqual({ state: 'idle' });
  });

  it('stops without errors while offline or signed out, and tries again next time', async () => {
    const s = setup();
    const cloud = fakeCloud();
    await s.books.add(pdf('a'), 'a.pdf');
    await s.books.add(pdf('b'), 'b.pdf');
    for (const kind of ['offline', 'signed-out', 'unavailable'] as const) {
      cloud.refuseAll(kind);
      cloud.calls.length = 0;
      const { up, statuses } = uploader(s, cloud.client);
      await up.run();
      expect(cloud.calls).toEqual(['start']); // Not one try per book.
      expect(statuses.at(-1)).toEqual({ state: 'idle' });
    }
    cloud.refuseAll(undefined);
    await uploader(s, cloud.client).up.run();
    expect(cloud.files.size).toBe(2);
  });

  it('skips a book the server does not know yet or has deleted, and goes on with the rest', async () => {
    const s = setup();
    const cloud = fakeCloud();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const b = await s.books.add(pdf('b'), 'b.pdf');
    cloud.failOnce('start', 'not-synced');
    await uploader(s, cloud.client).up.run();
    expect(cloud.files.has(a.id)).toBe(false);
    expect(cloud.files.has(b.id)).toBe(true);
  });

  it('reports a failure, skips that book, and runs one at a time', async () => {
    const s = setup();
    const cloud = fakeCloud();
    await s.books.add(pdf('a'), 'a.pdf');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    cloud.failOnce('complete', 'failed');
    const { up } = uploader(s, cloud.client);
    await Promise.all([up.run(), up.run()]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
    // The second run came after the first and finished the book.
    expect(cloud.files.size).toBe(1);
    expect(cloud.calls.filter((c) => c === 'start').length).toBe(1);
    expect(cloud.calls.filter((c) => c === 'complete').length).toBe(2);
  });

  it('a book removed from this device during an upload is skipped quietly', async () => {
    const s = setup();
    const cloud = fakeCloud();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const up = new Uploader(
      { getBytes: () => Promise.reject(new StorageError('not-found', 'gone')) },
      s.files,
      cloud.client,
    );
    await up.run();
    expect(cloud.files.has(a.id)).toBe(false);
  });
});
