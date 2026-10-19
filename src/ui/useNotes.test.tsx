import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorageError, type NoteStore } from '../storage/types';
import { useNotes } from './useNotes';

const target = { kind: 'page' as const, pageIndex: 0 };
function setup(
  store: NoteStore = { list: async () => [], put: async () => {}, remove: async () => {} },
) {
  return renderHook(() => useNotes({ bookId: 'book', store, highlights: [], now: () => 10 }));
}

describe('note drafts', () => {
  it('guards navigation and keeps text when discard is cancelled', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.items).toEqual([]));
    act(() => result.current.open(target));
    act(() => result.current.setText('My draft'));
    const navigate = vi.fn();
    act(() => result.current.request(navigate));
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.confirmation?.label).toBe('Discard changes');
    act(() => result.current.rejectConfirmation());
    expect(result.current.editor?.text).toBe('My draft');
    act(() => result.current.request(navigate));
    act(() => result.current.acceptConfirmation());
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(result.current.editor).toBeNull();
  });

  it('ignores duplicate saves while the write is pending', async () => {
    let finish: () => void = () => {};
    const put = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = setup({ list: async () => [], put, remove: async () => {} });
    await waitFor(() => expect(result.current.items).toEqual([]));
    act(() => result.current.open(target));
    act(() => result.current.setText('Two presses'));
    act(() => {
      void result.current.save();
      void result.current.save();
    });
    expect(put).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(result.current.items).toHaveLength(1);
    expect(result.current.editor).toBeNull();
  });

  it('retains text after a failed save and permits retry', async () => {
    const put = vi
      .fn()
      .mockRejectedValueOnce(new StorageError('quota', 'full'))
      .mockResolvedValue(undefined);
    const { result } = setup({ list: async () => [], put, remove: async () => {} });
    await waitFor(() => expect(result.current.items).toEqual([]));
    act(() => result.current.open(target));
    act(() => result.current.setText('Keep\n中文 📖'));
    await act(async () => result.current.save());
    expect(result.current.editor?.text).toBe('Keep\n中文 📖');
    expect(result.current.error).toContain("isn't enough storage");
    await act(async () => result.current.save());
    expect(result.current.items?.[0]?.text).toBe('Keep\n中文 📖');
    expect(result.current.error).toBeNull();
  });

  it('cannot write blank text or change notes before loading', async () => {
    const put = vi.fn(async () => {});
    const { result } = setup({ list: async () => [], put, remove: async () => {} });
    expect(result.current.unavailableReason).toContain('Loading');
    await waitFor(() => expect(result.current.items).toEqual([]));
    act(() => result.current.open(target));
    act(() => result.current.setText(' \n '));
    await act(async () => result.current.save());
    expect(put).not.toHaveBeenCalled();
    expect(result.current.editor).not.toBeNull();
  });

  it('prevents creation while a read is pending, after failure, and for an unsaved book', async () => {
    let rejectRead: (failure: unknown) => void = () => {};
    const list = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          rejectRead = reject;
        }),
    );
    const put = vi.fn(async () => {});
    const store = { list, put, remove: async () => {} };
    const { result, rerender } = renderHook(
      ({ bookId }: { bookId: string | null }) =>
        useNotes({ bookId, store, highlights: [], now: () => 1 }),
      { initialProps: { bookId: 'book' as string | null } },
    );
    expect(result.current.unavailableReason).toBe('Loading notes…');
    act(() => result.current.open(target));
    expect(result.current.editor).toBeNull();
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => rejectRead(new Error('Read failed')));
      expect(result.current.unavailableReason).toContain("couldn't be read");
      act(() => result.current.open(target));
      expect(result.current.editor).toBeNull();
      rerender({ bookId: null });
      expect(result.current.unavailableReason).toContain('saved on this device');
      act(() => result.current.open(target));
      expect(result.current.editor).toBeNull();
      expect(put).not.toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });
});
