import { StorageError } from '../storage/types';

export type AnnotationKind = 'bookmark' | 'highlight' | 'note' | 'voice note';

/** A readable message for a bookmark or highlight that couldn't be saved or removed. */
export function annotationMessage(
  error: unknown,
  kind: AnnotationKind,
  action: 'save' | 'remove',
): string {
  const errorKind = error instanceof StorageError ? error.kind : 'unknown';
  switch (errorKind) {
    case 'quota':
      return `There isn't enough storage space to save this ${kind}.`;
    case 'not-found':
      return `This book is no longer stored on this device, so its ${kind}s can't be changed.`;
    case 'unavailable':
    case 'unknown':
      return action === 'save'
        ? `This ${kind} couldn't be saved.`
        : `This ${kind} couldn't be removed.`;
  }
}

/** Logs failures nobody expects (the expected kinds are explained to the reader instead). */
export function logUnexpectedAnnotationError(error: unknown, what: string): void {
  if (!(error instanceof StorageError) || error.kind === 'unknown') console.error(what, error);
}
