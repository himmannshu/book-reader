// Voice notes for the open book (phase 15): list, record, play and delete.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Highlight } from '../core/highlights';
import type { NoteTarget } from '../core/notes';
import { sortVoiceNotes, type VoiceNote } from '../core/voice-notes';
import type { VoiceNoteStore } from '../storage/types';
import { annotationMessage, logUnexpectedAnnotationError } from './annotation-messages';
import { RecorderError, recorderMessage, startRecording, type Recording } from './recorder';

export interface ShownVoiceNote extends VoiceNote {
  /** An object URL for the audio element; revoked when the list changes. */
  url: string;
}

export function useVoiceNotes({
  bookId,
  store,
  highlights,
  now = Date.now,
  newId = () => crypto.randomUUID(),
}: {
  bookId: string | null;
  store: VoiceNoteStore;
  highlights: readonly Highlight[];
  now?: () => number;
  newId?: () => string;
}) {
  const [items, setItems] = useState<ShownVoiceNote[] | null>(null);
  const [recording, setRecording] = useState<{ target: NoteTarget; startedAt: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<Recording | null>(null);

  const show = useCallback((notes: VoiceNote[]) => {
    setItems((previous) => {
      for (const note of previous ?? []) URL.revokeObjectURL(note.url);
      return notes.map((note) => ({
        ...note,
        url: URL.createObjectURL(new Blob([note.audio], { type: note.type })),
      }));
    });
  }, []);

  useEffect(() => {
    if (bookId === null) return;
    let cancelled = false;
    store.list(bookId).then(
      (notes) => {
        if (!cancelled) show(notes);
      },
      (err: unknown) => {
        if (cancelled) return;
        console.error("Could not read the book's voice notes", err);
        setError("This book's voice notes couldn't be read.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bookId, store, show]);

  // Free the audio URLs and the microphone when the reader closes.
  useEffect(
    () => () => {
      active.current?.cancel();
      setItems((previous) => {
        for (const note of previous ?? []) URL.revokeObjectURL(note.url);
        return previous;
      });
    },
    [],
  );

  const save = useCallback(async () => {
    const current = active.current;
    const target = recording?.target;
    if (!current || !target || bookId === null) return;
    active.current = null;
    setRecording(null);
    setBusy(true);
    try {
      const recorded = await current.stop();
      const note: VoiceNote = {
        id: newId(),
        bookId,
        target,
        ...recorded,
        createdAt: now(),
      };
      await store.put(note);
      show([...(items ?? []), note]);
    } catch (err) {
      if (err instanceof RecorderError) {
        console.error('Recording failed', err);
        setError(recorderMessage(err));
      } else {
        logUnexpectedAnnotationError(err, 'Could not save the voice note');
        setError(annotationMessage(err, 'voice note', 'save'));
      }
    } finally {
      setBusy(false);
    }
  }, [recording, bookId, newId, now, store, show, items]);

  // The time limit stops the recording; save what was recorded.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const start = useCallback(
    async (target: NoteTarget) => {
      if (bookId === null || active.current || busy) return;
      setError(null);
      setBusy(true);
      try {
        const started = await startRecording();
        active.current = started;
        setRecording({ target, startedAt: started.startedAt });
        void started.limitReached.then(() => {
          if (active.current === started) void saveRef.current();
        });
      } catch (err) {
        if (!(err instanceof RecorderError) || err.kind === 'failed') {
          console.error('Could not start recording', err);
        }
        setError(recorderMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [bookId, busy],
  );

  const cancel = useCallback(() => {
    active.current?.cancel();
    active.current = null;
    setRecording(null);
  }, []);

  const remove = useCallback(
    async (note: VoiceNote) => {
      setError(null);
      try {
        await store.remove(note.id);
        show((items ?? []).filter((item) => item.id !== note.id));
      } catch (err) {
        logUnexpectedAnnotationError(err, 'Could not delete the voice note');
        setError("This voice note couldn't be deleted.");
      }
    },
    [store, show, items],
  );

  /** Drops voice notes whose highlight was removed (the store already deleted them). */
  const forgetHighlight = useCallback(
    (highlightId: string) => {
      if (
        !items?.some((n) => n.target.kind === 'highlight' && n.target.highlightId === highlightId)
      ) {
        return;
      }
      show(
        (items ?? []).filter(
          (n) => !(n.target.kind === 'highlight' && n.target.highlightId === highlightId),
        ),
      );
    },
    [items, show],
  );

  return {
    items: items === null ? null : sortVoiceNotes(items, highlights),
    recording,
    busy,
    error,
    start,
    save,
    cancel,
    remove,
    forgetHighlight,
  };
}
