import { useEffect, useRef, useState } from 'react';
import { bookmarkId, bookmarkLabel, sortByPage, type Bookmark } from '../core/bookmarks';
import type { OutlineItem, PdfDoc } from '../engine/types';
import { StorageError, type BookmarkStore } from '../storage/types';
import { Viewer, defaultViewerOptions } from '../viewer/viewer';
import { BookmarksPanel, UNSAVED_REASON, type BookmarksState } from './BookmarksPanel';
import { ContentsPanel, type OutlineState } from './ContentsPanel';

/** Below this width a side panel covers the pages instead of sitting beside them. */
const NARROW_QUERY = '(max-width: 699px)';
const CONTENTS_ID = 'contents-panel';
const BOOKMARKS_ID = 'bookmarks-panel';

type Panel = 'contents' | 'bookmarks';

/** A book's bookmarks once read; `bookId` says which book they belong to. */
type LoadedBookmarks =
  { bookId: string; status: 'failed' } | { bookId: string; status: 'ready'; items: Bookmark[] };

function bookmarkMessage(error: unknown, action: 'save' | 'remove'): string {
  const kind = error instanceof StorageError ? error.kind : 'unknown';
  switch (kind) {
    case 'quota':
      return "There isn't enough storage space to save this bookmark.";
    case 'not-found':
      return "This book is no longer stored on this device, so its bookmarks can't be changed.";
    case 'unavailable':
    case 'unknown':
      return action === 'save'
        ? "This bookmark couldn't be saved."
        : "This bookmark couldn't be removed.";
  }
}

interface ReaderViewProps {
  doc: PdfDoc;
  /** The stored book's id, or null while the book isn't saved on this device. */
  bookId: string | null;
  bookmarks: BookmarkStore;
  now?: () => number;
}

/** Hosts the plain-TS Viewer. React owns only this element; the viewer owns everything inside. */
export function ReaderView({ doc, bookId, bookmarks, now = Date.now }: ReaderViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarksButtonRef = useRef<HTMLButtonElement>(null);
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Loaded once per book, the first time it's needed, so it never delays the first page.
  const outlineRef = useRef<{ doc: PdfDoc; promise: Promise<OutlineItem[]> } | null>(null);
  const [loaded, setLoaded] = useState<{ doc: PdfDoc; outline: OutlineState } | null>(null);
  const outline: OutlineState = loaded?.doc === doc ? loaded.outline : { status: 'loading' };

  const [marks, setMarks] = useState<LoadedBookmarks | null>(null);
  const [changing, setChanging] = useState(false);
  const [marksError, setMarksError] = useState<string | null>(null);
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
    return panel === 'contents' ? contentsButtonRef : bookmarksButtonRef;
  }

  function togglePanel(panel: Panel) {
    if (openPanel === panel) {
      setOpenPanel(null);
      buttonFor(panel).current?.focus();
      return;
    }
    setOpenPanel(panel);
    if (panel === 'contents') void loadOutline();
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
    if (!(error instanceof StorageError) || error.kind === 'unknown') {
      console.error(`Could not ${action} the bookmark`, error);
    }
    setMarksError(bookmarkMessage(error, action));
  }

  async function removeBookmark(mark: Bookmark): Promise<boolean> {
    setChanging(true);
    setMarksError(null);
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
    setMarksError(null);
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

  // While a panel is open, Escape closes it wherever focus is: in the panel, on a button, in the
  // pages, or on the page body (in Safari a mouse click does not focus the button it clicks).
  useEffect(() => {
    if (!openPanel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenPanel(null);
      (openPanel === 'contents' ? contentsButtonRef : bookmarksButtonRef).current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openPanel]);

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
      </div>
      {marksError && (
        <p className="error" role="alert">
          {marksError}
        </p>
      )}
      <div className="reader-body">
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
        <div
          ref={scrollerRef}
          className="reader-scroller"
          data-testid="reader"
          tabIndex={0}
          role="region"
          aria-label="Book pages"
        />
      </div>
    </div>
  );
}
