// Transport for book files in the cloud (phase 09b). The HTTP version is in http-client.ts (the
// only place that calls fetch); tests use fakes.

export type FileErrorKind =
  | 'offline'
  | 'signed-out'
  /** The cloud for files isn't set up on this server. */
  | 'unavailable'
  /** The cloud doesn't have this book's file (yet). */
  | 'not-uploaded'
  | 'storage-full'
  /** The server doesn't know the book yet: sync first. */
  | 'not-synced'
  /** The book was deleted everywhere. */
  | 'deleted'
  /** The upload id expired or is unknown: start the upload again. */
  | 'no-such-upload'
  /** The downloaded bytes don't match the book (SHA-256 differs from its id). */
  | 'damaged'
  | 'failed';

export class FileError extends Error {
  readonly kind: FileErrorKind;

  constructor(kind: FileErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FileError';
    this.kind = kind;
  }
}

export interface UploadedPart {
  partNumber: number;
  etag: string;
}

export interface FileClient {
  /** Starts an upload, or says the cloud already has the file. */
  startUpload(
    bookId: string,
    size: number,
  ): Promise<{ done: true } | { uploadId: string; partSize: number }>;
  uploadPart(
    bookId: string,
    uploadId: string,
    partNumber: number,
    bytes: Uint8Array,
  ): Promise<UploadedPart>;
  completeUpload(bookId: string, uploadId: string, parts: UploadedPart[]): Promise<void>;
  /** Bytes [offset, offset + length) of the file, and the file's total size. */
  downloadRange(
    bookId: string,
    offset: number,
    length: number,
    signal?: AbortSignal,
  ): Promise<{ bytes: Uint8Array; total: number }>;
}
