import { describe, expect, it } from 'vitest';
import type { Highlight } from './highlights';
import {
  MAX_VOICE_NOTE_MS,
  formatDuration,
  pickAudioType,
  sortVoiceNotes,
  validVoiceNote,
  type VoiceNote,
} from './voice-notes';

const audio = new Uint8Array([1, 2, 3]).buffer;
const voice = (over: Partial<VoiceNote> = {}): VoiceNote => ({
  id: 'v1',
  bookId: 'b',
  target: { kind: 'page', pageIndex: 2 },
  audio,
  type: 'audio/webm',
  durationMs: 4200,
  createdAt: 10,
  ...over,
});

describe('validVoiceNote', () => {
  it('accepts a recorded note on a page or a highlight', () => {
    expect(validVoiceNote(voice())).toBe(true);
    expect(
      validVoiceNote(voice({ target: { kind: 'highlight', pageIndex: 1, highlightId: 'h' } })),
    ).toBe(true);
  });

  it('rejects damaged records', () => {
    for (const bad of [
      null,
      { ...voice(), audio: 'x' },
      voice({ durationMs: -1 }),
      voice({ durationMs: MAX_VOICE_NOTE_MS + 60_000 }),
      voice({ type: '' }),
      voice({ bookId: '' }),
      voice({ target: { kind: 'page', pageIndex: -1 } }),
      voice({ target: { kind: 'highlight', pageIndex: 1, highlightId: '' } }),
    ]) {
      expect(validVoiceNote(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('formatDuration', () => {
  it('shows minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(4200)).toBe('0:04');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(300_000)).toBe('5:00');
  });
});

describe('pickAudioType', () => {
  it('prefers a type the browser can record, falling back to its default', () => {
    expect(pickAudioType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickAudioType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickAudioType(() => false)).toBe('');
  });
});

describe('sortVoiceNotes', () => {
  it('orders by page, then by the position of the highlight on the page', () => {
    const highlights: Highlight[] = [
      {
        id: 'low',
        bookId: 'b',
        pageIndex: 1,
        rects: [{ pageIndex: 1, x: 0, y: 500, width: 1, height: 1 }],
        quote: 'q',
        createdAt: 1,
      },
      {
        id: 'high',
        bookId: 'b',
        pageIndex: 1,
        rects: [{ pageIndex: 1, x: 0, y: 100, width: 1, height: 1 }],
        quote: 'q',
        createdAt: 1,
      },
    ];
    const notes = [
      voice({ id: 'p3', target: { kind: 'page', pageIndex: 3 } }),
      voice({ id: 'low', target: { kind: 'highlight', pageIndex: 1, highlightId: 'low' } }),
      voice({ id: 'p1', target: { kind: 'page', pageIndex: 1 }, createdAt: 5 }),
      voice({ id: 'high', target: { kind: 'highlight', pageIndex: 1, highlightId: 'high' } }),
    ];
    expect(sortVoiceNotes(notes, highlights).map((n) => n.id)).toEqual(['p1', 'high', 'low', 'p3']);
  });
});
