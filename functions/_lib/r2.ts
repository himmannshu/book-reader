// FileBucket on a Cloudflare R2 binding.
import { NoSuchUpload, type FileBucket } from './files';

/** R2 reports an unknown, finished or aborted upload id with this message (code 10024). */
function translate(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/does not exist|\(10024\)/i.test(message)) throw new NoSuchUpload(message);
  throw error;
}

export function r2(bucket: R2Bucket): FileBucket {
  return {
    async createUpload(key) {
      return (await bucket.createMultipartUpload(key)).uploadId;
    },
    async uploadPart(key, uploadId, partNumber, body) {
      try {
        return await bucket.resumeMultipartUpload(key, uploadId).uploadPart(partNumber, body);
      } catch (error) {
        return translate(error);
      }
    },
    async complete(key, uploadId, parts) {
      try {
        return (await bucket.resumeMultipartUpload(key, uploadId).complete(parts)).size;
      } catch (error) {
        return translate(error);
      }
    },
    async abort(key, uploadId) {
      try {
        await bucket.resumeMultipartUpload(key, uploadId).abort();
      } catch (error) {
        translate(error);
      }
    },
    async get(key, range) {
      const object = await bucket.get(key, range ? { range } : undefined);
      return object ? { body: object.body, size: object.size } : null;
    },
    async size(key) {
      return (await bucket.head(key))?.size ?? null;
    },
    async delete(keys) {
      if (keys.length > 0) await bucket.delete(keys);
    },
  };
}
