// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FileError, type FileClient, type FileErrorKind } from './file-client';
import { downloadBook } from './downloader';

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function cloudWith(data: Uint8Array) {
  const ranges: [number, number][] = [];
  const failures: FileErrorKind[] = [];
  let tamper = false;
  const client: FileClient = {
    startUpload: () => Promise.reject(new Error('not used')),
    uploadPart: () => Promise.reject(new Error('not used')),
    completeUpload: () => Promise.reject(new Error('not used')),
    async downloadRange(_bookId, offset, length, signal) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      ranges.push([offset, length]);
      const kind = failures.shift();
      if (kind) throw new FileError(kind, kind);
      const bytes = data.slice(offset, offset + length);
      if (tamper && offset === 0) bytes[0] = (bytes[0] ?? 0) ^ 0xff;
      return { bytes, total: data.length };
    },
  };
  return {
    client,
    ranges,
    failNext: (...kinds: FileErrorKind[]) => failures.push(...kinds),
    tamper: () => {
      tamper = true;
    },
  };
}

const data = new TextEncoder().encode('%PDF-1.7 a small book of twenty-nine');
const noWait = { wait: async () => {} };

async function kind(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    if (error instanceof FileError) return error.kind;
    return error instanceof DOMException ? error.name : String(error);
  }
}

describe('downloadBook', () => {
  it('downloads in ranges with progress and checks the bytes against the book id', async () => {
    const id = await sha256Hex(data);
    const cloud = cloudWith(data);
    const progress: [number, number][] = [];
    const got = await downloadBook(id, cloud.client, {
      chunkSize: 10,
      onProgress: (received, total) => progress.push([received, total]),
      ...noWait,
    });
    expect(new TextDecoder().decode(got)).toBe(new TextDecoder().decode(data));
    expect(cloud.ranges).toEqual([
      [0, 10],
      [10, 10],
      [20, 10],
      [30, 10],
    ]);
    expect(progress.at(-1)).toEqual([data.length, data.length]);
    expect(progress.map(([r]) => r)).toEqual([10, 20, 30, data.length]);
  });

  it('rejects bytes that do not match the book', async () => {
    const id = await sha256Hex(data);
    const cloud = cloudWith(data);
    cloud.tamper();
    expect(await kind(downloadBook(id, cloud.client, { chunkSize: 10, ...noWait }))).toBe(
      'damaged',
    );
  });

  it('retries a range that failed, a few times, then gives up', async () => {
    const id = await sha256Hex(data);
    const cloud = cloudWith(data);
    cloud.failNext('failed', 'offline');
    expect(await kind(downloadBook(id, cloud.client, { chunkSize: 100, ...noWait }))).toBe('ok');

    const flaky = cloudWith(data);
    flaky.failNext('failed', 'failed', 'failed');
    expect(await kind(downloadBook(id, flaky.client, { chunkSize: 100, ...noWait }))).toBe(
      'failed',
    );
  });

  it('does not retry what retrying cannot fix', async () => {
    const id = await sha256Hex(data);
    for (const reason of ['not-uploaded', 'signed-out', 'deleted'] as const) {
      const cloud = cloudWith(data);
      cloud.failNext(reason);
      expect(await kind(downloadBook(id, cloud.client, { ...noWait }))).toBe(reason);
      expect(cloud.ranges).toHaveLength(1);
    }
  });

  it('stops when cancelled', async () => {
    const id = await sha256Hex(data);
    const cloud = cloudWith(data);
    const controller = new AbortController();
    const got = downloadBook(id, cloud.client, {
      chunkSize: 10,
      signal: controller.signal,
      onProgress: () => controller.abort(),
      ...noWait,
    });
    expect(await kind(got)).toBe('AbortError');
    expect(cloud.ranges).toHaveLength(1);
  });
});
