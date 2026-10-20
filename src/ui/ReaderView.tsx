import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from 'react';
import { bookmarkId, bookmarkLabel, sortByPage, type Bookmark } from '../core/bookmarks';
import type { Highlight } from '../core/highlights';
import { exportFileName, exportMarkdown } from '../core/export';
import type { Note, NoteTarget } from '../core/notes';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_LEVELS,
  zoomIn,
  zoomLabel,
  zoomOut,
  type ReadingState,
  type ZoomSetting,
} from '../core/reading-state';
import type { OutlineItem, PdfDoc } from '../engine/types';
import type { BookmarkStore, HighlightStore, NoteStore, ReadingStateStore } from '../storage/types';
import { Viewer, defaultViewerOptions } from '../viewer/viewer';
import { annotationMessage, logUnexpectedAnnotationError } from './annotation-messages';
import { BookmarksPanel, UNSAVED_REASON, type BookmarksState } from './BookmarksPanel';
import { ContentsPanel, type OutlineState } from './ContentsPanel';
import { SelectionActions } from './SelectionActions';
import { useHighlights } from './useHighlights';
import { useNotes } from './useNotes';
import { NotesPanel } from './NotesPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { SearchPanel } from './SearchPanel';
import { useSearch } from './useSearch';
import { downloadText } from './download';

/** Below this width a side panel covers the pages instead of sitting beside them. */
const NARROW_QUERY = '(max-width: 699px)';
const CONTENTS_ID = 'contents-panel';
const BOOKMARKS_ID = 'bookmarks-panel';
const NOTES_ID = 'notes-panel';
const SEARCH_ID = 'search-panel';
const NO_HIGHLIGHTS: readonly Highlight[] = [];
/** Scrolling must pause this long before the reading place is saved. */
const SAVE_DELAY_MS = 600;
const ZOOM_CHOICES: readonly ZoomSetting[] = ['fit-width', 'fit-page', ...ZOOM_LEVELS];

type Panel = 'contents' | 'bookmarks' | 'notes' | 'search';

export interface ReaderHandle {
  requestNavigation(proceed: () => void): void;
}

/** A book's bookmarks once read; `bookId` says which book they belong to. */
type LoadedBookmarks =
  { bookId: string; status: 'failed' } | { bookId: string; status: 'ready'; items: Bookmark[] };

interface ReaderViewProps {
  doc: PdfDoc;
  /** The book's title, for exports. */
  title?: string;
  /** The stored book's id, or null while the book isn't saved on this device. */
  bookId: string | null;
  bookmarks: BookmarkStore;
  highlights: HighlightStore;
  notes: NoteStore;
  /** Where each book was left on this device. */
  readingStates: ReadingStateStore;
  /** Where this book was left, to open there (null: from the start, or found once it is saved). */
  initialState?: ReadingState | null;
  ref?: Ref<ReaderHandle>;
  /** Bumped when another device changed data; reloads bookmarks, highlights and notes. */
  syncVersion?: number;
  now?: () => number;
  newId?: () => string;
}

const randomId = () => crypto.randomUUID();

/** Hosts the plain-TS Viewer. React owns only this element; the viewer owns everything inside. */
export function ReaderView({
  doc,
  title = 'Untitled book',
  bookId,
  bookmarks,
  highlights,
  notes,
  readingStates,
  initialState = null,
  ref,
  syncVersion = 0,
  now = Date.now,
  newId = randomId,
}: ReaderViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarksButtonRef = useRef<HTMLButtonElement>(null);
  const notesButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState<ZoomSetting>(initialState?.zoom ?? 'fit-width');
  /** Fixed at mount: the reader is keyed by book, so a new book gets a new ReaderView. */
  const opening = useRef(initialState);
  /** True once the reader scrolled or zoomed; a late-found saved place then no longer applies. */
  const moved = useRef(false);
  /** Saves the reading place now (set by the viewer effect). */
  const saveNow = useRef<() => void>(() => undefined);
  const saving = useRef({ bookId, readingStates, now });
  useEffect(() => {
    saving.current = { bookId, readingStates, now };
  }, [bookId, readingStates, now]);

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
      zoom: opening.current?.zoom,
      initialPosition: opening.current?.position,
    });
    viewerRef.current = viewer;
    // Focus the pages so arrow keys, Page Down and Space scroll the book right away.
    scroller.focus({ preventScroll: true });

    // Save the reading place once scrolling pauses, and always when the page is hidden or closed
    // and on leaving (a scroll just before may not have reported yet). The scroll listener only
    // notes the time: WebKit has little scroll headroom.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastScroll = 0;
    let dirty = false;
    const save = () => {
      clearTimeout(timer);
      timer = undefined;
      const { bookId: id, readingStates: store, now: clock } = saving.current;
      if (!dirty || id === null) return;
      dirty = false;
      const state = {
        bookId: id,
        position: viewer.position,
        zoom: viewer.zoom,
        savedAt: clock(),
        pageCount: doc.pageCount,
      };
      store.put(state).catch((error: unknown) => {
        // Reading goes on; the next pause tries again.
        dirty = true;
        console.error('Could not save the reading position', error);
      });
    };
    const check = () => {
      const idle = performance.now() - lastScroll;
      if (idle >= SAVE_DELAY_MS) save();
      else timer = setTimeout(check, SAVE_DELAY_MS - idle);
    };
    const onScroll = () => {
      lastScroll = performance.now();
      dirty = true;
      moved.current = true;
      timer ??= setTimeout(check, SAVE_DELAY_MS);
    };
    const saveAlways = () => {
      dirty = true;
      save();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveAlways();
    };
    saveNow.current = saveAlways;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', saveAlways);
    return () => {
      // Saving on leaving happens in the layout effect below, while the pages are still attached.
      clearTimeout(timer);
      saveNow.current = () => undefined;
      scroller.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', saveAlways);
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [doc]);

  // Leaving the reader saves the place. A layout effect's cleanup runs before React detaches the
  // pages; a detached scroller reads as scrolled to the top.
  useLayoutEffect(() => () => saveNow.current(), []);

  // A book opened with Open PDF gets its stored id only once saved. If it was read here before,
  // go to where it was left, unless the reader has already moved.
  const startedUnsaved = useRef(bookId === null);
  useEffect(() => {
    if (bookId === null || !startedUnsaved.current) return;
    startedUnsaved.current = false;
    let cancelled = false;
    readingStates.get(bookId).then(
      (state) => {
        const viewer = viewerRef.current;
        if (cancelled || !state || !viewer || moved.current) return;
        viewer.setZoom(state.zoom);
        setZoom(state.zoom);
        viewer.goTo(state.position);
      },
      (error: unknown) => {
        if (!cancelled) console.error("Could not read the book's last position", error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bookId, readingStates]);

  function changeZoom(next: ZoomSetting) {
    const viewer = viewerRef.current;
    if (!viewer) return;
    moved.current = true;
    viewer.setZoom(next);
    setZoom(next);
    saveNow.current();
  }

  function stepZoom(direction: 'in' | 'out') {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const level = direction === 'in' ? zoomIn(viewer.zoomPercent) : zoomOut(viewer.zoomPercent);
    if (level !== null) changeZoom(level);
  }

  /** + (or =), - and 0 zoom while the pages have focus. Cmd/Ctrl + and - stay the browser's. */
  function onPagesKeyDown(event: ReactKeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') stepZoom('in');
    else if (event.key === '-') stepZoom('out');
    else if (event.key === '0') changeZoom('fit-width');
    else return;
    event.preventDefault();
  }

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
  }, [bookId, bookmarks, syncVersion]);

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
        : panel === 'notes'
          ? notesButtonRef
          : searchButtonRef;
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
    syncVersion,
    store: highlights,
    viewer: viewerRef,
    scroller: scrollerRef,
    body: bodyRef,
    now,
    newId,
    onError: setAnnotationError,
  });
  const highlightList = marked.items ?? NO_HIGHLIGHTS;
  const written = useNotes({ bookId, syncVersion, store: notes, highlights: highlightList, now });
  useImperativeHandle(ref, () => ({ requestNavigation: written.request }), [written.request]);

  // Search (phase 13). Matches stay marked while there is a query, even with the panel closed.
  const { state: searchState, search } = useSearch(doc);
  const [searchCurrent, setSearchCurrent] = useState<number | null>(null);
  const searchQuery = searchState.query;
  useEffect(() => {
    viewerRef.current?.setSearch(searchQuery.trim() ? searchQuery : null);
  }, [searchQuery]);

  function runSearch(query: string) {
    setSearchCurrent(null);
    void search(query);
  }

  function chooseSearchResult(index: number) {
    const results =
      searchState.status === 'searching' || searchState.status === 'done'
        ? searchState.results
        : [];
    const result = results[index];
    if (!result) return;
    setSearchCurrent(index);
    viewerRef.current?.setSearch(searchState.query, {
      pageIndex: result.pageIndex,
      occurrence: result.occurrence,
    });
    if (window.matchMedia(NARROW_QUERY).matches) {
      setOpenPanel(null);
      scrollerRef.current?.focus({ preventScroll: true });
    }
  }

  // Cmd/Ctrl+F opens the book's search instead of the browser's (which can't see the pages).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'f')
        return;
      event.preventDefault();
      written.request(() => {
        marked.dismiss();
        setOpenPanel('search');
        // Already open: put the cursor back in the box.
        document.querySelector<HTMLInputElement>(`#${SEARCH_ID} input`)?.focus();
      });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  const exportUnavailableReason =
    bookId === null
      ? 'Export works once the book is saved on this device.'
      : written.failed || (marked.items === null && marked.unavailableReason !== null)
        ? "Export needs this book's highlights and notes, which couldn't be read. Try again later."
        : marked.items === null || written.items === null
          ? 'Loading highlights and notes…'
          : null;

  async function exportAnnotations() {
    if (exportUnavailableReason !== null) return;
    // Without a readable table of contents the export is grouped by page only (and logged).
    const entries = await loadOutline().catch((): OutlineItem[] => []);
    try {
      const markdown = exportMarkdown({
        title,
        highlights: highlightList,
        notes: written.items ?? [],
        outline: entries,
        exportedAt: new Date(now()),
      });
      downloadText(exportFileName(title), markdown, 'text/markdown');
    } catch (error) {
      console.error('Exporting failed', error);
      setAnnotationError("The highlights and notes couldn't be exported. Try again.");
    }
  }

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
        <button
          ref={searchButtonRef}
          type="button"
          className="button secondary"
          aria-expanded={openPanel === 'search'}
          aria-controls={openPanel === 'search' ? SEARCH_ID : undefined}
          onClick={() => togglePanel('search')}
        >
          Search
        </button>
        <div className="zoom-controls">
          <button
            type="button"
            className="button secondary"
            aria-label="Zoom out"
            disabled={zoom === MIN_ZOOM}
            onClick={() => stepZoom('out')}
          >
            −
          </button>
          <select
            className="picker"
            aria-label="Zoom"
            value={String(zoom)}
            onChange={(event) => {
              const value = event.currentTarget.value;
              changeZoom(value === 'fit-width' || value === 'fit-page' ? value : Number(value));
            }}
          >
            {(ZOOM_CHOICES.includes(zoom) ? ZOOM_CHOICES : [...ZOOM_CHOICES, zoom]).map(
              (choice) => (
                <option key={choice} value={String(choice)}>
                  {zoomLabel(choice)}
                </option>
              ),
            )}
          </select>
          <button
            type="button"
            className="button secondary"
            aria-label="Zoom in"
            disabled={zoom === MAX_ZOOM}
            onClick={() => stepZoom('in')}
          >
            +
          </button>
        </div>
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
            onExport={() => void exportAnnotations()}
            exportUnavailableReason={exportUnavailableReason}
          />
        )}
        {openPanel === 'search' && (
          <SearchPanel
            id={SEARCH_ID}
            state={searchState}
            pageCount={doc.pageCount}
            current={searchCurrent}
            onSearch={runSearch}
            onChoose={chooseSearchResult}
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
          onKeyDown={onPagesKeyDown}
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
