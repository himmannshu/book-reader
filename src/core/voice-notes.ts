// Voice notes (phase 15): a short recording on a page or a highlight. Pure logic.
// Kept on this device only for now (see the phase-15 context file).
import type { Highlight } from './highlights';
import type { NoteTarget } from './notes';

/** Recording stops by itself after 5 minutes, which bounds storage (about 2–5 MB). */
export const MAX_VOICE_NOTE_MS = 5 * 60 * 1000;

export interface VoiceNote {
  /** Random. A page or highlight may have several. */
  id: string;
  bookId: string;
  target: NoteTarget;
  /** The recording (an ArrayBuffer: Safari refuses Blobs in IndexedDB). */
  audio: ArrayBuffer;
  /** Its media type, such as audio/mp4 (Safari) or audio/webm (Chrome). */
  type: string;
  durationMs: number;
  /** Milliseconds since the epoch. */
  createdAt: number;
}

/** Types to record in, best first: Safari makes MP4/AAC, Chrome and Firefox WebM/Opus. */
const AUDIO_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

/** The first type the browser can record, or '' to let it choose. */
export function pickAudioType(supported: (type: string) => boolean): string {
  return AUDIO_TYPES.find(supported) ?? '';
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function validVoiceNote(value: unknown): value is VoiceNote {
  if (typeof value !== 'object' || value === null) return false;
  const note = value as Record<string, unknown>;
  const target = note.target as Record<string, unknown> | null | undefined;
  if (typeof note.id !== 'string' || !note.id) return false;
  if (typeof note.bookId !== 'string' || !note.bookId) return false;
  // Not instanceof: a buffer cloned out of IndexedDB may come from another realm.
  if (Object.prototype.toString.call(note.audio) !== '[object ArrayBuffer]') return false;
  if (typeof note.type !== 'string' || !note.type) return false;
  if (!finite(note.durationMs) || note.durationMs < 0) return false;
  // A little slack over the limit: the recorder stops on a timer.
  if (note.durationMs > MAX_VOICE_NOTE_MS + 5000) return false;
  if (!finite(note.createdAt)) return false;
  if (typeof target !== 'object' || target === null) return false;
  const pageIndex = target.pageIndex;
  if (!finite(pageIndex) || !Number.isInteger(pageIndex) || pageIndex < 0) return false;
  if (target.kind === 'page') return true;
  return (
    target.kind === 'highlight' && typeof target.highlightId === 'string' && !!target.highlightId
  );
}

/** "1:05" */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** By page; on a page, page notes first, then by the position of their highlight; then oldest first. */
export function sortVoiceNotes<T extends VoiceNote>(
  notes: readonly T[],
  highlights: readonly Highlight[],
): T[] {
  const byId = new Map(highlights.map((h) => [h.id, h]));
  const position = (note: T) =>
    note.target.kind === 'highlight' ? byId.get(note.target.highlightId)?.rects[0] : undefined;
  return [...notes].sort(
    (a, b) =>
      a.target.pageIndex - b.target.pageIndex ||
      (position(a)?.y ?? -1) - (position(b)?.y ?? -1) ||
      (position(a)?.x ?? -1) - (position(b)?.x ?? -1) ||
      a.createdAt - b.createdAt,
  );
}
