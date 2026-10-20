// Test-only FileBucket in memory, with R2's multipart rules (parts of equal size except the last).
// Not deployed: Pages only bundles what functions/api imports.
import { NoSuchUpload, type FileBucket, type UploadedPart } from './files';

async function toBytes(body: ReadableStream | Uint8Array): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body.slice();
  return new Uint8Array(await new Response(body).arrayBuffer());
}

export function memoryBucket(): FileBucket & { uploadedParts: number; objectCount(): number } {
  const objects = new Map<string, Uint8Array>();
  const uploads = new Map<string, { key: string; parts: Map<number, Uint8Array> }>();
  let next = 0;

  function upload(key: string, uploadId: string) {
    const found = uploads.get(uploadId);
    if (!found || found.key !== key)
      throw new NoSuchUpload('The specified multipart upload does not exist.');
    return found;
  }

  const bucket = {
    uploadedParts: 0,
    objectCount: () => objects.size,
    async createUpload(key: string) {
      const id = `upload-${++next}`;
      uploads.set(id, { key, parts: new Map() });
      return id;
    },
    async uploadPart(
      key: string,
      uploadId: string,
      partNumber: number,
      body: ReadableStream | Uint8Array,
    ) {
      const found = upload(key, uploadId);
      found.parts.set(partNumber, await toBytes(body));
      bucket.uploadedParts++;
      return {
        partNumber,
        etag: `etag-${uploadId}-${partNumber}-${found.parts.get(partNumber)?.length}`,
      };
    },
    async complete(key: string, uploadId: string, parts: UploadedPart[]) {
      const found = upload(key, uploadId);
      const chunks = [...parts]
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((p) => {
          const bytes = found.parts.get(p.partNumber);
          if (!bytes || p.etag !== `etag-${uploadId}-${p.partNumber}-${bytes.length}`) {
            throw new Error('InvalidPart');
          }
          return bytes;
        });
      const first = chunks[0]?.length ?? 0;
      chunks.forEach((chunk, i) => {
        if (i < chunks.length - 1 ? chunk.length !== first : chunk.length > first) {
          throw new Error('EntityTooSmall: parts must be the same size except the last');
        }
      });
      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      const data = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
      objects.set(key, data);
      uploads.delete(uploadId);
      return total;
    },
    async abort(key: string, uploadId: string) {
      upload(key, uploadId);
      uploads.delete(uploadId);
    },
    async get(key: string, range?: { offset: number; length: number }) {
      const data = objects.get(key);
      if (!data) return null;
      const slice = range ? data.slice(range.offset, range.offset + range.length) : data;
      return { body: new Blob([slice]).stream(), size: data.length };
    },
    async size(key: string) {
      return objects.get(key)?.length ?? null;
    },
    async delete(keys: string[]) {
      for (const key of keys) objects.delete(key);
    },
  };
  return bucket;
}
