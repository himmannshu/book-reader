import { useEffect, useMemo, useRef, useState } from 'react';
import type { Highlight } from '../core/highlights';
import { noteId, sortNotes, validNoteText, type Note, type NoteTarget } from '../core/notes';
import type { NoteStore } from '../storage/types';
import { annotationMessage, logUnexpectedAnnotationError } from './annotation-messages';

export interface NoteEditorState {
  target: NoteTarget;
  text: string;
  original: Note | null;
}

export interface Confirmation {
  title: string;
  message: string;
  label: string;
  cancelLabel?: string;
  run(): void;
}

export function useNotes({
  bookId,
  store,
  highlights,
  now,
}: {
  bookId: string | null;
  store: NoteStore;
  highlights: readonly Highlight[];
  now(): number;
}) {
  const [loaded, setLoaded] = useState<
    { bookId: string; items: Note[] } | { bookId: string; failed: true } | null
  >(null);
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<NoteEditorState | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const writing = useRef(false);
  const current = loaded?.bookId === bookId ? loaded : null;
  const rows = current && 'items' in current ? current.items : null;
  const items = useMemo(() => (rows ? sortNotes(rows, highlights) : null), [rows, highlights]);
  const failed = current !== null && 'failed' in current;
  const unavailableReason =
    bookId === null
      ? 'Notes need this book saved on this device.'
      : failed
        ? "This book's notes couldn't be read."
        : !items
          ? 'Loading notes…'
          : null;
  const dirty = editor !== null && editor.text !== (editor.original?.text ?? '');

  useEffect(() => {
    if (bookId === null) return;
    let cancelled = false;
    store.list(bookId).then(
      (list) => {
        if (!cancelled) setLoaded({ bookId, items: list });
      },
      (failure: unknown) => {
        if (cancelled) return;
        console.error("Could not read the book's notes", failure);
        setLoaded({ bookId, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bookId, store, reload]);

  /** The one guard used by note/panel navigation and the app's Library/file-open actions. */
  function request(proceed: () => void) {
    if (writing.current) {
      setError('Please wait for the note change to finish.');
      return;
    }
    const run = () => {
      setEditor(null);
      setError(null);
      proceed();
    };
    if (!dirty) {
      run();
      return;
    }
    setConfirmation({
      title: 'Discard changes?',
      message: 'Your changes to this note have not been saved.',
      label: 'Discard changes',
      cancelLabel: 'Keep editing',
      run,
    });
  }

  function open(target: NoteTarget, afterOpen: () => void = () => {}) {
    if (unavailableReason || bookId === null) {
      setError(unavailableReason);
      return;
    }
    const id = noteId(bookId, target);
    if (editor && noteId(bookId, editor.target) === id) {
      afterOpen();
      return;
    }
    request(() => {
      const original = items?.find((note) => note.id === id) ?? null;
      setEditor({ target, text: original?.text ?? '', original });
      afterOpen();
    });
  }

  async function write(work: () => Promise<void>, action: 'save' | 'remove') {
    if (writing.current) return;
    writing.current = true;
    setChanging(true);
    setError(null);
    try {
      await work();
    } catch (failure) {
      logUnexpectedAnnotationError(failure, `Could not ${action} the note`);
      setError(annotationMessage(failure, 'note', action));
    } finally {
      writing.current = false;
      setChanging(false);
    }
  }

  async function save() {
    if (!editor || bookId === null || !items || !validNoteText(editor.text)) return;
    const time = now();
    const note: Note = {
      id: noteId(bookId, editor.target),
      bookId,
      target: editor.target,
      text: editor.text,
      createdAt: editor.original?.createdAt ?? time,
      updatedAt: time,
    };
    await write(async () => {
      await store.put(note);
      setLoaded((shown) =>
        shown?.bookId === bookId && 'items' in shown
          ? { bookId, items: [...shown.items.filter((item) => item.id !== note.id), note] }
          : shown,
      );
      setEditor(null);
    }, 'save');
  }

  function remove(note: Note) {
    const ask = () =>
      setConfirmation({
        title: 'Delete note?',
        message: 'This deletes the saved note. Its highlight, if any, will stay.',
        label: 'Delete note',
        run: () => {
          void write(async () => {
            await store.remove(note.id);
            setLoaded((shown) =>
              shown && 'items' in shown
                ? { ...shown, items: shown.items.filter((item) => item.id !== note.id) }
                : shown,
            );
            if (editor && noteId(note.bookId, editor.target) === note.id) setEditor(null);
          }, 'remove');
        },
      });
    if (dirty && editor && noteId(note.bookId, editor.target) !== note.id) request(ask);
    else ask();
  }

  return {
    items,
    editor,
    dirty,
    changing,
    error,
    unavailableReason,
    failed,
    confirmation,
    open,
    save,
    remove,
    request,
    setText: (text: string) => setEditor((shown) => (shown ? { ...shown, text } : shown)),
    cancel: () => {
      if (!writing.current) {
        setEditor(null);
        setError(null);
      }
    },
    retry: () => {
      setLoaded(null);
      setReload((count) => count + 1);
    },
    ask: (question: Confirmation) => setConfirmation(question),
    acceptConfirmation: () => {
      const action = confirmation;
      setConfirmation(null);
      action?.run();
    },
    rejectConfirmation: () => setConfirmation(null),
    forgetHighlight: (id: string) =>
      setLoaded((shown) =>
        shown && 'items' in shown
          ? {
              ...shown,
              items: shown.items.filter(
                (note) => note.target.kind !== 'highlight' || note.target.highlightId !== id,
              ),
            }
          : shown,
      ),
  };
}
