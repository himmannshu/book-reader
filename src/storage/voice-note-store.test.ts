// Phase 15: voice notes on this device.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { Highlight } from '../core/highlights';
import type { SyncItem } from '../core/sync';
import type { VoiceNote } from '../core/voice-notes';
import { createIndexedDBStores } from './indexeddb-book-store';

function setup() {
  let clock = 1_000;
  return createIndexedDBStores({
    factory: new IDBFactory(),
    now: () => ++clock,
    requestPersistence: async () => true,
  });
}

const pdf = (text: string) => new Blob([`%PDF-1.7 ${text}`]);
const voice = (id: string, bookId: string, over: Partial<VoiceNote> = {}): VoiceNote => ({
  id,
  bookId,
  target: { kind: 'page', pageIndex: 0 },
  audio: new Uint8Array([7, 8, 9]).buffer,
  type: 'audio/webm',
  durationMs: 1500,
  createdAt: 1,
  ...over,
});

describe('voice notes', () => {
  it('are saved with their audio and listed per book', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const b = await s.books.add(pdf('b'), 'b.pdf');
    await s.voiceNotes.put(voice('v1', a.id));
    await s.voiceNotes.put(voice('v2', b.id));
    const [only] = await s.voiceNotes.list(a.id);
    expect(only?.id).toBe('v1');
    expect([...new Uint8Array(only?.audio ?? new ArrayBuffer(0))]).toEqual([7, 8, 9]);
  });

  it('refuse a note for a book that is not stored, and are never queued for sync', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const before = await s.sync.pending();
    await expect(s.voiceNotes.put(voice('v', 'nope'))).rejects.toMatchObject({ kind: 'not-found' });
    await s.voiceNotes.put(voice('v1', a.id));
    expect(await s.sync.pending()).toEqual(before);
  });

  it('can be removed', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    await s.voiceNotes.put(voice('v1', a.id));
    await s.voiceNotes.remove('v1');
    expect(await s.voiceNotes.list(a.id)).toEqual([]);
  });

  it('go with their highlight, with their book, and with a book deleted on another device', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const b = await s.books.add(pdf('b'), 'b.pdf');
    const passage: Highlight = {
      id: 'h1',
      bookId: a.id,
      pageIndex: 0,
      rects: [{ pageIndex: 0, x: 1, y: 1, width: 5, height: 5 }],
      quote: 'q',
      createdAt: 1,
    };
    await s.highlights.put(passage);
    await s.voiceNotes.put(
      voice('on-highlight', a.id, {
        target: { kind: 'highlight', pageIndex: 0, highlightId: 'h1' },
      }),
    );
    await s.voiceNotes.put(voice('on-page', a.id));
    await s.highlights.remove('h1');
    expect((await s.voiceNotes.list(a.id)).map((v) => v.id)).toEqual(['on-page']);

    await s.books.remove(a.id);
    expect(await s.voiceNotes.list(a.id)).toEqual([]);

    await s.voiceNotes.put(voice('on-b', b.id));
    const deletion: SyncItem = {
      kind: 'book',
      id: b.id,
      bookId: b.id,
      updatedAt: 1e12,
      deleted: true,
      device: 'other',
      data: null,
    };
    await s.sync.applyRemote([deletion]);
    expect(await s.voiceNotes.list(b.id)).toEqual([]);
  });
});
