import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VoiceNote } from '../core/voice-notes';
import type { VoiceNoteStore } from '../storage/types';
import type { Recording } from './recorder';

let resolveStart: (recording: Recording) => void = () => {};
vi.mock('./recorder', async (original) => ({
  ...(await original<typeof import('./recorder')>()),
  startRecording: () => new Promise<Recording>((resolve) => (resolveStart = resolve)),
}));

const { useVoiceNotes } = await import('./useVoiceNotes');
const NO_HIGHLIGHTS: never[] = [];

const note = (id: string): VoiceNote => ({
  id,
  bookId: 'b',
  target: { kind: 'page', pageIndex: 0 },
  audio: new Uint8Array([1]).buffer,
  type: 'audio/webm',
  durationMs: 1000,
  createdAt: 1,
});

function store(notes: VoiceNote[] = []): VoiceNoteStore {
  return { list: async () => notes, put: async () => {}, remove: async () => {} };
}

describe('useVoiceNotes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('frees the audio URLs when the reader closes', async () => {
    let n = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++n}`);
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    // One store for every render: a new one each time would reload the list in a loop.
    const notes = store([note('a'), note('c')]);
    const { result, unmount } = renderHook(() =>
      useVoiceNotes({ bookId: 'b', store: notes, highlights: NO_HIGHLIGHTS }),
    );
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    unmount();
    expect(revoke.mock.calls.map(([url]) => url).sort()).toEqual(['blob:1', 'blob:2']);
  });

  it('releases the microphone if the reader closed while the permission prompt was up', async () => {
    const empty = store();
    const { result, unmount } = renderHook(() =>
      useVoiceNotes({ bookId: 'b', store: empty, highlights: NO_HIGHLIGHTS }),
    );
    await waitFor(() => expect(result.current.items).toEqual([]));
    let starting!: Promise<void>;
    act(() => {
      starting = result.current.start({ kind: 'page', pageIndex: 0 });
    });
    unmount();
    const cancel = vi.fn();
    resolveStart({
      startedAt: 0,
      limitReached: new Promise(() => {}),
      stop: async () => ({ audio: new ArrayBuffer(1), type: 'audio/webm', durationMs: 1 }),
      cancel,
    });
    await starting;
    expect(cancel).toHaveBeenCalled();
  });

  it('does not keep a recording that came out empty', async () => {
    const put = vi.fn(async () => {});
    const saving = { ...store(), put };
    const { result } = renderHook(() =>
      useVoiceNotes({ bookId: 'b', store: saving, highlights: NO_HIGHLIGHTS }),
    );
    await waitFor(() => expect(result.current.items).toEqual([]));
    let starting!: Promise<void>;
    act(() => {
      starting = result.current.start({ kind: 'page', pageIndex: 0 });
    });
    resolveStart({
      startedAt: 0,
      limitReached: new Promise(() => {}),
      stop: async () => ({ audio: new ArrayBuffer(10), type: 'audio/webm', durationMs: 120 }),
      cancel: () => {},
    });
    await act(async () => starting);
    await act(async () => result.current.save());
    expect(put).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      'The recording was empty. Check the microphone and try again.',
    );
  });
});
