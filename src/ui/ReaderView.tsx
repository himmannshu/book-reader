import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { bookmarkId, bookmarkLabel, sortByPage, type Bookmark } from '../core/bookmarks';
import type { Highlight } from '../core/highlights';
import type { Note, NoteTarget } from '../core/notes';
import type { OutlineItem, PdfDoc } from '../engine/types';
import type { BookmarkStore, HighlightStore, NoteStore } from '../storage/types';
import { Viewer, defaultViewerOptions } from '../viewer/viewer';
import { annotationMessage, logUnexpectedAnnotationError } from './annotation-messages';
import { BookmarksPanel, UNSAVED_REASON, type BookmarksState } from './BookmarksPanel';
import { ContentsPanel, type OutlineState } from './ContentsPanel';
import { SelectionActions } from './SelectionActions';
import { useHighlights } from './useHighlights';
import { useNotes } from './useNotes';
import { NotesPanel } from './NotesPanel';
import { ConfirmDialog } from './ConfirmDialog';

/** Below this width a side panel covers the pages instead of sitting beside them. */
const NARROW_QUERY = '(max-width: 699px)';
const CONTENTS_ID = 'contents-panel';
const BOOKMARKS_ID = 'bookmarks-panel';
const NOTES_ID = 'notes-panel';
const NO_HIGHLIGHTS: readonly Highlight[] = [];

type Panel = 'contents' | 'bookmarks' | 'notes';

export interface ReaderHandle {
  requestNavigation(proceed: () => void): void;
}

/** A book's bookmarks once read; `bookId` says which book they belong to. */
type LoadedBookmarks =
  { bookId: string; status: 'failed' } | { bookId: string; status: 'ready'; items: Bookmark[] };

interface ReaderViewProps {
  doc: PdfDoc;
  /** The stored book's id, or null while the book isn't saved on this device. */
  bookId: string | null;
  bookmarks: BookmarkStore;
  highlights: HighlightStore;
  notes: NoteStore;
  ref?: Ref<ReaderHandle>;
  now?: () => number;
  newId?: () => string;
}

const randomId = () => crypto.randomUUID();

/** Hosts the plain-TS Viewer. React owns only this element; the viewer owns everything inside. */
export function ReaderView({
  doc,
  bookId,
  bookmarks,
  highlights,
  notes,
  ref,
  now = Date.now,
  newId = randomId,
}: ReaderViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarksButtonRef = useRef<HTMLButtonElement>(null);
  const notesButtonRef = useRef<HTMLButtonElement>(null);
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Loaded once per book, the first time it's needed, so it never delays the first page.
  const outlineRef = useRef<{ doc: PdfDoc; promise: Promise<OutlineItem[]> } | null>(null);
  const [loaded, setLoaded] = useState<{ doc: PdfDoc; outline: OutlineState } | null>(null);
  const outline: OutlineState = loaded?.doc === doc ? loaded.outline : { status: 'loading' };

  const [marks, setMarks] = useState<LoadedBookmarks | null>(null);
  const [changing, setChanging] = useState(false);
  /** A readable message about a bookmark or highlight that couldn't be saved or removed. */
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const bookmarksState: BookmarksState =
    bookId === null
      ? { status: 'unsaved' }
      : marks?.bookId === bookId
        ? marks
        : { status: 'loading' };
  const items = bookmarksState.status === 'ready' ? bookmarksState.items : null;
  const currentMark = items?.find((mark) => mark.pageIndex === currentPage);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const viewer = new Viewer(scroller, doc, {
      ...defaultViewerOptions,
      onPageChange: setCurrentPage,
    });
    viewerRef.current = viewer;
    // Focus the pages so arrow keys, Page Down and Space scroll the book right away.
    scroller.focus({ preventScroll: true });
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [doc]);

  // Read after the viewer starts; the first page never waits for it.
  useEffect(() => {
    if (bookId === null) return;
    let cancelled = false;
    bookmarks.list(bookId).then(
      (list) => {
        if (!cancelled) setMarks({ bookId, status: 'ready', items: list });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error("Could not read the book's bookmarks", error);
        setMarks({ bookId, status: 'failed' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bookId, bookmarks]);

  function loadOutline(): Promise<OutlineItem[]> {
    if (outlineRef.current?.doc !== doc) {
      const promise = doc.outline();
      outlineRef.current = { doc, promise };
      promise.then(
        (items) => setLoaded({ doc, outline: { status: 'ready', items } }),
        (error: unknown) => {
          if (doc.destroyed) return;
          console.error('Could not read the table of contents', error);
          setLoaded({ doc, outline: { status: 'failed' } });
        },
      );
    }
    return outlineRef.current.promise;
  }

  function buttonFor(panel: Panel) {
    return panel === 'contents'
      ? contentsButtonRef
      : panel === 'bookmarks'
        ? bookmarksButtonRef
        : notesButtonRef;
  }

  function togglePanel(panel: Panel) {
    written.request(() => {
      marked.dismiss();
      if (openPanel === panel) {
        setOpenPanel(null);
        buttonFor(panel).current?.focus();
        return;
      }
      setOpenPanel(panel);
      if (panel === 'contents') void loadOutline();
    });
  }

  function choose(pageIndex: number) {
    viewerRef.current?.scrollToPage(pageIndex);
    if (window.matchMedia(NARROW_QUERY).matches) setOpenPanel(null);
    // Focus the pages, so Space and Page Down scroll the book instead of repeating the jump.
    scrollerRef.current?.focus({ preventScroll: true });
  }

  /** Applies a change to the list of the book the change was made for. */
  function updateItems(forBook: string, change: (items: Bookmark[]) => Bookmark[]) {
    setMarks((current) =>
      current?.bookId === forBook && current.status === 'ready'
        ? { ...current, items: change(current.items) }
        : current,
    );
  }

  function reportFailure(error: unknown, action: 'save' | 'remove') {
    logUnexpectedAnnotationError(error, `Could not ${action} the bookmark`);
    setAnnotationError(annotationMessage(error, 'bookmark', action));
  }

  async function removeBookmark(mark: Bookmark): Promise<boolean> {
    setChanging(true);
    setAnnotationError(null);
    try {
      await bookmarks.remove(mark.id);
      updateItems(mark.bookId, (list) => list.filter((m) => m.id !== mark.id));
      return true;
    } catch (error) {
      reportFailure(error, 'remove');
      return false;
    } finally {
      setChanging(false);
    }
  }

  async function toggleBookmark() {
    if (bookId === null || !items || changing) return;
    if (currentMark) {
      await removeBookmark(currentMark);
      return;
    }
    const pageIndex = currentPage;
    setChanging(true);
    setAnnotationError(null);
    try {
      // A table of contents that can't be read only costs the chapter name (and is logged).
      const entries = await loadOutline().catch((): OutlineItem[] => []);
      const mark: Bookmark = {
        id: bookmarkId(bookId, pageIndex),
        bookId,
        pageIndex,
        label: bookmarkLabel(pageIndex, entries),
        createdAt: now(),
      };
      await bookmarks.put(mark);
      updateItems(bookId, (list) => sortByPage([...list.filter((m) => m.id !== mark.id), mark]));
    } catch (error) {
      reportFailure(error, 'save');
    } finally {
      setChanging(false);
    }
  }

  const marked = useHighlights({
    bookId,
    store: highlights,
    viewer: viewerRef,
    scroller: scrollerRef,
    body: bodyRef,
    now,
    newId,
    onError: setAnnotationError,
  });
  const highlightList = marked.items ?? NO_HIGHLIGHTS;
  const written = useNotes({ bookId, store: notes, highlights: highlightList, now });
  useImperativeHandle(ref, () => ({ requestNavigation: written.request }), [written.request]);

  function openNote(target: NoteTarget) {
    written.open(target, () => {
      marked.dismiss();
      setOpenPanel('notes');
    });
  }

  function chooseNote(note: Note) {
    written.request(() => {
      const target = note.target;
      const passage =
        target.kind === 'highlight'
          ? highlightList.find((highlight) => highlight.id === target.highlightId)
          : undefined;
      const rect = passage?.rects[0];
      if (rect) viewerRef.current?.scrollToRect(rect);
      else viewerRef.current?.scrollToPage(note.target.pageIndex);
      if (window.matchMedia(NARROW_QUERY).matches) setOpenPanel(null);
      scrollerRef.current?.focus({ preventScroll: true });
    });
  }

  function removeHighlight(id: string) {
    written.request(() => {
      const attached = written.items?.find(
        (note) => note.target.kind === 'highlight' && note.target.highlightId === id,
      );
      const remove = async () => {
        if (await marked.removeHighlight(id)) written.forgetHighlight(id);
      };
      if (attached)
        written.ask({
          title: 'Remove highlight and note?',
          message: 'This removes the highlight and its attached note.',
          label: 'Remove both',
          run: () => {
            void remove();
          },
        });
      else void remove();
    });
  }
  const dismissHighlightAction = marked.dismiss;
  const requestNoteNavigation = written.request;
  const noteConfirmation = written.confirmation;

  // Escape first hides a floating highlight button. Otherwise, while a panel is open, it closes the
  // panel wherever focus is: in the panel, on a button, in the pages, or on the page body (in
  // Safari a mouse click does not focus the button it clicks).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (noteConfirmation) return;
      if (dismissHighlightAction()) return;
      if (!openPanel) return;
      requestNoteNavigation(() => {
        setOpenPanel(null);
        buttonFor(openPanel).current?.focus();
      });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openPanel, dismissHighlightAction, requestNoteNavigation, noteConfirmation]);

  return (
    <div className="reader">
      <div className="reader-tools">
        <button
          ref={contentsButtonRef}
          type="button"
          className="button secondary"
          aria-expanded={openPanel === 'contents'}
          aria-controls={openPanel === 'contents' ? CONTENTS_ID : undefined}
          onClick={() => togglePanel('contents')}
        >
          Contents
        </button>
        <button
          ref={bookmarksButtonRef}
          type="button"
          className="button secondary"
          aria-expanded={openPanel === 'bookmarks'}
          aria-controls={openPanel === 'bookmarks' ? BOOKMARKS_ID : undefined}
          onClick={() => togglePanel('bookmarks')}
        >
          Bookmarks
        </button>
        <button
          type="button"
          className="button secondary bookmark-toggle"
          aria-pressed={currentMark !== undefined}
          // Not disabled while a change is saving: that would drop keyboard focus. Clicks are ignored instead.
          disabled={!items}
          title={bookId === null ? UNSAVED_REASON : undefined}
          onClick={() => void toggleBookmark()}
        >
          Bookmark page
        </button>
        <button
          ref={notesButtonRef}
          type="button"
          className="button secondary"
          aria-expanded={openPanel === 'notes'}
          aria-controls={openPanel === 'notes' ? NOTES_ID : undefined}
          onClick={() => togglePanel('notes')}
        >
          Notes
        </button>
      </div>
      {annotationError && (
        <p className="error" role="alert">
          {annotationError}
        </p>
      )}
      <div ref={bodyRef} className="reader-body">
        {openPanel === 'contents' && (
          <ContentsPanel id={CONTENTS_ID} outline={outline} onChoose={choose} />
        )}
        {openPanel === 'bookmarks' && (
          <BookmarksPanel
            id={BOOKMARKS_ID}
            bookmarks={bookmarksState}
            onChoose={choose}
            onRemove={removeBookmark}
          />
        )}
        {openPanel === 'notes' && (
          <NotesPanel
            id={NOTES_ID}
            notes={written}
            highlights={highlightList}
            currentPage={currentPage}
            onOpen={openNote}
            onChoose={chooseNote}
          />
        )}
        <div
          ref={scrollerRef}
          className="reader-scroller"
          data-testid="reader"
          tabIndex={0}
          role="region"
          aria-label="Book pages"
          onClick={marked.onPagesClick}
        />
        <SelectionActions
          action={marked.action}
          unsavedReason={marked.unavailableReason}
          onHighlight={() => void marked.highlightSelection()}
          onRemove={removeHighlight}
          onNote={(id) => {
            const highlight = highlightList.find((item) => item.id === id);
            if (highlight)
              openNote({ kind: 'highlight', pageIndex: highlight.pageIndex, highlightId: id });
          }}
          noteLabel={
            marked.action?.kind === 'remove' &&
            written.items?.some(
              (note) =>
                note.target.kind === 'highlight' &&
                marked.action?.kind === 'remove' &&
                note.target.highlightId === marked.action.id,
            )
              ? 'Edit note'
              : 'Add note'
          }
          noteUnavailableReason={written.unavailableReason}
          removeUnavailableReason={written.unavailableReason}
        />
      </div>
      {written.confirmation && (
        <ConfirmDialog
          question={written.confirmation}
          onConfirm={written.acceptConfirmation}
          onCancel={written.rejectConfirmation}
        />
      )}
    </div>
  );
}
