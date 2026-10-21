import { createPortal } from 'react-dom';
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  bookmarkId,
  bookmarkLabel,
  chapterAt,
  chapterPathAt,
  sortByPage,
  type Bookmark,
} from '../core/bookmarks';
import type { Highlight } from '../core/highlights';
import { exportFileName, exportMarkdown } from '../core/export';
import { excerptText } from '../core/share';
import type { Note, NoteTarget } from '../core/notes';
import type { PageLabels } from '../core/page-labels';
import {
  fitModeOf,
  nearestZoomLevel,
  zoomForFit,
  zoomIn,
  zoomOut,
  type FitMode,
  type ReadingState,
  type Theme,
  type ZoomSetting,
} from '../core/reading-state';
import type { OutlineItem, PdfDoc } from '../engine/types';
import type {
  BookmarkStore,
  HighlightStore,
  NoteStore,
  ReadingStateStore,
  VoiceNoteStore,
} from '../storage/types';
import { Viewer, defaultViewerOptions } from '../viewer/viewer';
import { annotationMessage, logUnexpectedAnnotationError } from './annotation-messages';
import { BookmarksPanel, UNSAVED_REASON, type BookmarksState } from './BookmarksPanel';
import { ContentsPanel, outlineKey, type OutlineState } from './ContentsPanel';
import { SelectionActions } from './SelectionActions';
import { useHighlights } from './useHighlights';
import { useNotes } from './useNotes';
import { NotesPanel } from './NotesPanel';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Button,
  IconButton,
  NARROW_QUERY,
  SidePanel,
  Tabs,
  Toast,
  useMediaQuery,
} from './controls';
import { PagePill } from './PagePill';
import { ReaderToolbar, toolFor, type PanelTool, type ToolbarPanel } from './ReaderToolbar';
import { ReadingSettings } from './ReadingSettings';
import { SearchPanel } from './SearchPanel';
import { useVoiceNotes } from './useVoiceNotes';
import { browserSpeaker, type Speaker } from './speech';
import { SPEEDS, useReadAloud } from './useReadAloud';
import { Elapsed, VoiceNotes } from './VoiceNotes';
import { useSearch } from './useSearch';
import { downloadText } from './download';
import { shareText } from './share';

const CONTENTS_ID = 'contents-panel';
const BOOKMARKS_ID = 'bookmarks-panel';
const NOTES_ID = 'notes-panel';
const SEARCH_ID = 'search-panel';
const SETTINGS_ID = 'reading-settings';
/** The tabbed panel for Contents, Bookmarks and Notes (phase 20). */
const TABBED_PANEL_ID = 'reader-panel';
type Tab = 'contents' | 'bookmarks' | 'notes';
const TAB_TITLES: Record<Tab, string> = {
  contents: 'Contents',
  bookmarks: 'Bookmarks',
  notes: 'Notes',
};
const APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const NO_HIGHLIGHTS: readonly Highlight[] = [];
const NO_VOICE_NOTES: VoiceNoteStore = {
  list: async () => [],
  put: async () => {},
  remove: async () => {},
};
/** Scrolling must pause this long before the reading place is saved. */
const SAVE_DELAY_MS = 600;
/** The page pill fades this long after scrolling stops (the design: about a second). */
const PILL_DELAY_MS = 1000;
/** Keys that scroll the pages, which fade the toolbar like the wheel does. */
const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End']);

type Panel = PanelTool;

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
  /** Voice notes (phase 15); without one, the reader offers none. */
  voiceNotes?: VoiceNoteStore;
  /** Speech for reading aloud (phase 16); the browser's own by default. */
  speaker?: Speaker;
  /** Where the reader puts its toolbar (the app's header), so the reader has one bar. */
  toolsSlot?: HTMLElement | null;
  /** Back to the library (the toolbar's first button). */
  onLibrary?(): void;
  /** Sync status for the toolbar; it shows itself only when it needs the reader. */
  status?: ReactNode;
  /** The theme, for Reading settings. */
  theme?: Theme;
  onThemeChange?(theme: Theme): void;
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
  voiceNotes = NO_VOICE_NOTES,
  speaker: givenSpeaker,
  initialState = null,
  toolsSlot = null,
  onLibrary,
  status,
  theme = 'light',
  onThemeChange,
  ref,
  syncVersion = 0,
  now = Date.now,
  newId = randomId,
}: ReaderViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  /** The tab Contents opens on: the one used last. */
  const [lastTab, setLastTab] = useState<Tab>('contents');
  if (openPanel !== null && openPanel !== 'search' && openPanel !== lastTab) setLastTab(openPanel);
  /** Folded parents in the contents tree (outlineKey), kept while the panel is closed. */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const narrow = useMediaQuery(NARROW_QUERY);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState<ZoomSetting>(initialState?.zoom ?? 'fit-width');
  /** The zoom now shown, in Width and Page modes too (Reading settings shows it). */
  const [shownPercent, setShownPercent] = useState(100);
  /** The page pill shows while the pages scroll; `settledPage` is the page it last settled on. */
  const [pill, setPill] = useState({
    visible: false,
    settledPage: initialState?.position.pageIndex ?? 0,
  });
  const [pageLabels, setPageLabels] = useState<PageLabels>(null);
  /** The toolbar fades while the reader scrolls (phase 19). */
  const [toolbarHidden, setToolbarHidden] = useState(false);
  /** Whether the toolbar may fade now: nothing it opened, or that sits over the pages, is open. */
  const canHideToolbar = useRef(false);
  /** Work that waits until the first page is drawn (set below, where loadOutline is defined). */
  const afterFirstPage = useRef<() => void>(() => undefined);
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
      onFirstPageDrawn: () => afterFirstPage.current(),
      zoom: opening.current?.zoom,
      initialPosition: opening.current?.position,
      initialCentre: opening.current?.centreX,
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
    // The page pill: shown on the first scroll event, hidden once scrolling has paused.
    let pillTimer: ReturnType<typeof setTimeout> | undefined;
    const settlePill = () => {
      const idle = performance.now() - lastScroll;
      if (idle < PILL_DELAY_MS) {
        pillTimer = setTimeout(settlePill, PILL_DELAY_MS - idle);
        return;
      }
      pillTimer = undefined;
      setPill({ visible: false, settledPage: viewer.currentPage });
    };
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
        centreX: viewer.horizontalCentre,
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
      if (pillTimer === undefined) {
        setPill((shown) => (shown.visible ? shown : { ...shown, visible: true }));
        pillTimer = setTimeout(settlePill, PILL_DELAY_MS);
      }
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
      clearTimeout(pillTimer);
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
        setShownPercent(viewer.zoomPercent);
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
    setShownPercent(viewer.zoomPercent);
    saveNow.current();
  }

  function chooseFit(fit: FitMode) {
    changeZoom(zoomForFit(fit, viewerRef.current?.zoomPercent ?? shownPercent));
  }

  function toggleSettings() {
    if (!settingsOpen) setShownPercent(viewerRef.current?.zoomPercent ?? 100);
    setSettingsOpen(!settingsOpen);
  }

  /**
   * Closes Reading settings and gives focus back to its button. After a click outside, focus stays
   * where the click put it (the pages, a control); only a click on something that takes no focus
   * sends it back to the button. That is known once the browser has handled the click.
   */
  function closeSettings(afterClick: boolean) {
    setSettingsOpen(false);
    if (!afterClick) {
      settingsButtonRef.current?.focus();
      return;
    }
    setTimeout(() => {
      const focused = document.activeElement;
      if (focused === null || focused === document.body) {
        settingsButtonRef.current?.focus({ preventScroll: true });
      }
    }, 0);
  }

  function stepZoom(direction: 'in' | 'out') {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const level = direction === 'in' ? zoomIn(viewer.zoomPercent) : zoomOut(viewer.zoomPercent);
    if (level !== null) changeZoom(level);
  }

  // Pinch to zoom (phase 14): Safari's gesture events (trackpad, and two fingers on iPad and
  // iPhone) settle on the nearest level. Chrome's ctrl+wheel pinch is not handled: it needs a
  // non-passive wheel listener, which makes every wheel scroll wait for the main thread.
  const zooming = useRef({ set: changeZoom });
  useEffect(() => {
    zooming.current = { set: changeZoom };
  });
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let startPercent = 100;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      startPercent = viewerRef.current?.zoomPercent ?? 100;
    };
    const onGestureChange = (event: Event) => event.preventDefault();
    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      const scale = (event as Event & { scale?: number }).scale ?? 1;
      if (Math.abs(scale - 1) < 0.05) return;
      zooming.current.set(nearestZoomLevel(startPercent * scale));
    };
    scroller.addEventListener('gesturestart', onGestureStart);
    scroller.addEventListener('gesturechange', onGestureChange);
    scroller.addEventListener('gestureend', onGestureEnd);
    return () => {
      scroller.removeEventListener('gesturestart', onGestureStart);
      scroller.removeEventListener('gesturechange', onGestureChange);
      scroller.removeEventListener('gestureend', onGestureEnd);
    };
  }, []);

  /** + (or =), - and 0 zoom while the pages have focus. Cmd/Ctrl + and - stay the browser's. */
  function onPagesKeyDown(event: ReactKeyboardEvent) {
    if (SCROLL_KEYS.has(event.key)) hideToolbar();
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

  // The chapter (toolbar) and the page labels (page pill) are read once the first page is drawn,
  // so they never delay it.
  useEffect(() => {
    afterFirstPage.current = () => {
      void loadOutline();
      doc.pageLabels().then(
        (labels) => {
          if (!doc.destroyed) setPageLabels(labels);
        },
        (error: unknown) => {
          // The pill then shows page numbers.
          if (!doc.destroyed) console.error("Could not read the book's page labels", error);
        },
      );
    };
  });

  function buttonFor(panel: Panel) {
    // On phones the panels open from More, so focus goes back there.
    // (jsdom, in unit tests, has no matchMedia: a wide screen there.)
    if (typeof window.matchMedia === 'function' && window.matchMedia(NARROW_QUERY).matches) {
      return moreButtonRef;
    }
    return toolFor(panel) === 'search' ? searchButtonRef : contentsButtonRef;
  }

  /** Opens a tab or panel; the contents opens the current chapter's parents. */
  function showPanel(panel: Panel) {
    setOpenPanel(panel);
    if (panel !== 'contents') return;
    void loadOutline();
    const path = outline.status === 'ready' ? chapterPathAt(currentPage, outline.items) : null;
    if (!path || path.length < 2) return;
    const parents = path.slice(0, -1).map((_, depth) => outlineKey(path.slice(0, depth + 1)));
    setCollapsed((folded) => new Set([...folded].filter((key) => !parents.includes(key))));
  }

  /** A toolbar tool: Contents opens the tabbed panel on its last tab; a second press closes it. */
  function togglePanel(tool: ToolbarPanel) {
    written.request(() => {
      marked.dismiss();
      if (openPanel !== null && toolFor(openPanel) === tool) {
        setOpenPanel(null);
        buttonFor(openPanel).current?.focus();
        return;
      }
      showPanel(tool === 'search' ? 'search' : lastTab);
    });
  }

  function chooseTab(tab: Tab) {
    written.request(() => showPanel(tab));
  }

  function closePanel() {
    const panel = openPanel;
    if (panel === null) return;
    written.request(() => {
      setOpenPanel(null);
      buttonFor(panel).current?.focus();
    });
  }

  function toggleFold(key: string) {
    setCollapsed((folded) => {
      const next = new Set(folded);
      if (!next.delete(key)) next.add(key);
      return next;
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
  const voice = useVoiceNotes({ bookId, store: voiceNotes, highlights: highlightList, now, newId });
  const [defaultSpeaker] = useState(browserSpeaker);
  const listen = useReadAloud({
    doc,
    viewer: viewerRef,
    speaker: givenSpeaker ?? defaultSpeaker,
    onError: setAnnotationError,
  });
  const voiceUnavailableReason =
    bookId === null ? 'Voice notes work once the book is saved on this device.' : null;

  function recordVoiceNote(target: NoteTarget) {
    written.request(() => {
      marked.dismiss();
      setOpenPanel('notes');
      void voice.start(target);
    });
  }

  function goToNoteTarget(target: NoteTarget) {
    const passage =
      target.kind === 'highlight'
        ? highlightList.find((highlight) => highlight.id === target.highlightId)
        : undefined;
    const rect = passage?.rects[0];
    if (rect) viewerRef.current?.scrollToRect(rect);
    else viewerRef.current?.scrollToPage(target.pageIndex);
    if (window.matchMedia(NARROW_QUERY).matches) setOpenPanel(null);
    scrollerRef.current?.focus({ preventScroll: true });
  }
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

  const searchResults =
    searchState.status === 'searching' || searchState.status === 'done' ? searchState.results : [];

  /** Next or previous match, wrapping around (the search bar on phones). */
  function stepSearch(delta: number) {
    if (searchResults.length === 0) return;
    const from = searchCurrent ?? (delta > 0 ? -1 : 0);
    chooseSearchResult((from + delta + searchResults.length) % searchResults.length);
  }

  // Cmd/Ctrl+F opens the book's search instead of the browser's (which can't see the pages).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Cmd on Apple devices (where Ctrl+F moves the cursor in text fields), Ctrl elsewhere.
      const command = APPLE ? event.metaKey : event.ctrlKey;
      if (!command || event.altKey || event.key.toLowerCase() !== 'f') return;
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

  /** A short confirmation over the pages (phase 17), like the app's own notice. */
  const [readerNotice, setReaderNotice] = useState<{ text: string; key: number } | null>(null);

  async function shareHighlight(id: string) {
    const passage = highlightList.find((highlight) => highlight.id === id);
    if (!passage) return;
    marked.dismiss();
    setAnnotationError(null);
    try {
      const result = await shareText(title, excerptText({ ...passage, title }));
      if (result === 'copied') {
        setReaderNotice({ text: 'Copied the passage to the clipboard.', key: now() });
      }
    } catch (error) {
      console.error('Could not share the passage', error);
      setAnnotationError("This passage couldn't be shared or copied here.");
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
        if (await marked.removeHighlight(id)) {
          written.forgetHighlight(id);
          voice.forgetHighlight(id);
        }
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

  // Escape first closes Reading settings, then hides a floating highlight button. Otherwise, while
  // a panel is open, it closes the panel wherever focus is: in the panel, on a button, in the
  // pages, or on the page body (in Safari a mouse click does not focus the button it clicks).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (noteConfirmation) return;
      if (settingsOpen) {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
        return;
      }
      if (dismissHighlightAction()) return;
      if (!openPanel) return;
      requestNoteNavigation(() => {
        setOpenPanel(null);
        buttonFor(openPanel).current?.focus();
      });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openPanel, dismissHighlightAction, requestNoteNavigation, noteConfirmation, settingsOpen]);

  // The toolbar fades when the reader scrolls the pages (wheel, touch or keys; not when the app
  // moves them), and comes back on a tap on the pages, a tap where it was, or keyboard focus in
  // it. It never fades while something it opened, or something over the pages, is open.
  const searchBarShown = narrow && searchCurrent !== null && openPanel !== 'search';
  const toolbarHeld =
    openPanel !== null ||
    settingsOpen ||
    menuOpen ||
    marked.action !== null ||
    listen.state.status !== 'idle' ||
    voice.recording !== null ||
    written.confirmation !== null ||
    (searchBarShown && searchResults.length > 0);
  // Something opening brings a faded toolbar back (state adjusted while rendering, not in an effect).
  if (toolbarHeld && toolbarHidden) setToolbarHidden(false);
  useEffect(() => {
    canHideToolbar.current = !toolbarHeld;
  }, [toolbarHeld]);

  function hideToolbar() {
    if (!canHideToolbar.current) return;
    canHideToolbar.current = false;
    setToolbarHidden(true);
  }

  function showToolbar() {
    setToolbarHidden(false);
  }

  useEffect(() => {
    if (toolbarHidden) return;
    // Listening only while shown: once faded, the wheel and touch listeners are gone, so steady
    // scrolling pays nothing for them (WebKit has little scroll headroom).
    canHideToolbar.current = !toolbarHeld;
    const scroller = scrollerRef.current;
    const onInput = () => {
      if (!canHideToolbar.current) return;
      canHideToolbar.current = false;
      setToolbarHidden(true);
    };
    scroller?.addEventListener('wheel', onInput, { passive: true });
    scroller?.addEventListener('touchmove', onInput, { passive: true });
    return () => {
      scroller?.removeEventListener('wheel', onInput);
      scroller?.removeEventListener('touchmove', onInput);
    };
    // toolbarHeld is read when the toolbar comes back; its own effect above follows changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolbarHidden]);

  useEffect(() => {
    if (!toolbarHidden || !toolsSlot) return;
    const show = () => setToolbarHidden(false);
    toolsSlot.addEventListener('pointerdown', show);
    toolsSlot.addEventListener('focusin', show);
    return () => {
      toolsSlot.removeEventListener('pointerdown', show);
      toolsSlot.removeEventListener('focusin', show);
    };
  }, [toolbarHidden, toolsSlot]);

  const chapterFor = (pageIndex: number) =>
    outline.status === 'ready' ? chapterAt(pageIndex, outline.items)?.title.trim() : undefined;
  const chapter = chapterFor(currentPage);
  const currentPath = outline.status === 'ready' ? chapterPathAt(currentPage, outline.items) : null;
  const notesCount =
    written.items !== null && voice.items !== null
      ? written.items.length + voice.items.length
      : undefined;
  const presentation = narrow ? 'sheet' : 'side';

  const tools = (
    <ReaderToolbar
      title={title}
      chapter={chapter || undefined}
      compact={narrow}
      hidden={toolbarHidden}
      onLibrary={() => onLibrary?.()}
      openPanel={openPanel}
      panelId={openPanel === 'search' ? SEARCH_ID : TABBED_PANEL_ID}
      panelButtons={{ contents: contentsButtonRef, search: searchButtonRef }}
      onPanel={togglePanel}
      listening={listen.state.status !== 'idle'}
      onListen={() => {
        if (listen.state.status === 'idle') void listen.start();
        else listen.stop();
      }}
      settingsOpen={settingsOpen}
      settingsId={SETTINGS_ID}
      settingsButton={settingsButtonRef}
      onSettings={toggleSettings}
      bookmarked={currentMark !== undefined}
      bookmarkDisabled={bookId !== null && !items}
      bookmarkUnavailable={bookId === null ? UNSAVED_REASON : null}
      onBookmark={() => {
        if (bookId === null) setAnnotationError(UNSAVED_REASON);
        else void toggleBookmark();
      }}
      moreButton={moreButtonRef}
      onMenuChange={setMenuOpen}
      status={status}
    />
  );

  return (
    <div className="reader">
      {toolsSlot ? createPortal(tools, toolsSlot) : tools}
      {annotationError && (
        <Toast tone="danger" onDismiss={() => setAnnotationError(null)}>
          {annotationError}
        </Toast>
      )}
      <div ref={bodyRef} className="reader-body">
        <div
          ref={scrollerRef}
          className="reader-scroller"
          data-testid="reader"
          tabIndex={0}
          role="region"
          aria-label="Book pages"
          onClick={(event) => {
            showToolbar();
            marked.onPagesClick(event);
          }}
          onKeyDown={onPagesKeyDown}
        />
        {openPanel !== null && openPanel !== 'search' && (
          <SidePanel
            id={TABBED_PANEL_ID}
            title={TAB_TITLES[openPanel]}
            presentation={presentation}
            onClose={closePanel}
            header={
              <Tabs<Tab>
                label="Reader panels"
                value={openPanel}
                onChange={chooseTab}
                items={[
                  { value: 'contents', label: 'Contents', controls: CONTENTS_ID },
                  {
                    value: 'bookmarks',
                    label: 'Bookmarks',
                    count: items?.length,
                    controls: BOOKMARKS_ID,
                  },
                  { value: 'notes', label: 'Notes', count: notesCount, controls: NOTES_ID },
                ]}
              />
            }
          >
            {openPanel === 'contents' && (
              <ContentsPanel
                id={CONTENTS_ID}
                outline={outline}
                current={currentPath}
                collapsed={collapsed}
                onToggle={toggleFold}
                pageLabels={pageLabels}
                onChoose={choose}
              />
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
                chapterFor={chapterFor}
              >
                <VoiceNotes
                  voice={voice}
                  currentPage={currentPage}
                  unavailableReason={voiceUnavailableReason}
                  quoteFor={(target) =>
                    target.kind === 'highlight'
                      ? highlightList.find((highlight) => highlight.id === target.highlightId)
                          ?.quote
                      : undefined
                  }
                  onGoTo={goToNoteTarget}
                  chapterFor={chapterFor}
                />
              </NotesPanel>
            )}
          </SidePanel>
        )}
        {openPanel === 'search' && (
          <SidePanel title="Search" presentation={presentation} onClose={closePanel}>
            <SearchPanel
              id={SEARCH_ID}
              state={searchState}
              pageCount={doc.pageCount}
              current={searchCurrent}
              onSearch={runSearch}
              onChoose={chooseSearchResult}
              chapterFor={chapterFor}
            />
          </SidePanel>
        )}
        <PagePill
          pageIndex={currentPage}
          pageCount={doc.pageCount}
          labels={pageLabels}
          visible={pill.visible}
          // While the pages are still, the current page is the settled one (a book reopened
          // further in says so at once); mid-scroll, the page it last settled on.
          settledPageIndex={pill.visible ? pill.settledPage : currentPage}
        />
        {listen.state.status !== 'idle' && (
          <div className="player-bar" role="toolbar" aria-label="Read aloud">
            <span className="player-status" role="status">
              {listen.state.status === 'reading' ? 'Reading' : 'Paused on'} page{' '}
              {listen.state.pageIndex + 1}
            </span>
            {listen.state.status === 'reading' ? (
              <IconButton icon="pause" label="Pause" onClick={listen.pause} />
            ) : (
              <IconButton icon="play" label="Resume" onClick={listen.resume} />
            )}
            <IconButton icon="stop" label="Stop reading" onClick={listen.stop} />
            <select
              className="picker"
              aria-label="Speed"
              value={String(listen.rate)}
              onChange={(event) => listen.changeRate(Number(event.currentTarget.value))}
            >
              {SPEEDS.map((speed) => (
                <option key={speed} value={String(speed)}>
                  {speed}×
                </option>
              ))}
            </select>
          </div>
        )}
        {searchBarShown && searchResults.length > 0 && (
          <div className="search-bar" role="toolbar" aria-label="Search matches">
            <IconButton icon="collapse" label="Previous match" onClick={() => stepSearch(-1)} />
            <span className="search-bar-count">
              {searchCurrent + 1} of {searchResults.length}
            </span>
            <IconButton icon="expand" label="Next match" onClick={() => stepSearch(1)} />
            <IconButton icon="close" label="Close search" onClick={() => runSearch('')} />
          </div>
        )}
        {voice.recording && openPanel !== 'notes' && (
          // The Notes panel was closed mid-recording: keep it visible (phase 15 review).
          <div className="player-bar recording-bar" role="toolbar" aria-label="Recording">
            <span className="recording-dot" aria-hidden="true" />
            <span className="player-status">
              Recording voice note · <Elapsed since={voice.recording.startedAt} />
            </span>
            <Button variant="primary" size="sm" onClick={() => void voice.save()}>
              Stop and save
            </Button>
            <Button size="sm" onClick={voice.cancel}>
              Cancel recording
            </Button>
          </div>
        )}
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
          onShare={(id) => void shareHighlight(id)}
          onVoiceNote={(id) => {
            const highlight = highlightList.find((item) => item.id === id);
            if (highlight)
              recordVoiceNote({
                kind: 'highlight',
                pageIndex: highlight.pageIndex,
                highlightId: id,
              });
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
      {settingsOpen && (
        <ReadingSettings
          id={SETTINGS_ID}
          theme={theme}
          onTheme={onThemeChange}
          zoomPercent={shownPercent}
          canZoomOut={zoomOut(shownPercent) !== null}
          canZoomIn={zoomIn(shownPercent) !== null}
          onZoomOut={() => stepZoom('out')}
          onZoomIn={() => stepZoom('in')}
          fit={fitModeOf(zoom)}
          onFit={chooseFit}
          onDismiss={() => closeSettings(true)}
        />
      )}
      {readerNotice && <Toast key={readerNotice.key}>{readerNotice.text}</Toast>}
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
