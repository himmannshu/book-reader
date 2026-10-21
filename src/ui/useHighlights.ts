import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import {
  normalizeQuote,
  sortByPosition,
  type Highlight,
  type HighlightColor,
} from '../core/highlights';
import type { HighlightStore } from '../storage/types';
import type { Viewer } from '../viewer/viewer';
import { annotationMessage, logUnexpectedAnnotationError } from './annotation-messages';
import type { SelectionAction } from './SelectionActions';

export const HIGHLIGHT_UNSAVED_REASON = 'Highlights need this book saved on this device.';
export const HIGHLIGHTS_UNREADABLE = "This book's highlights couldn't be read.";

/** Rough width of the menu, to keep it inside the reader. */
const BUTTON_WIDTH = 170;
const MARGIN = 8;

/** The screen span the menu must not cover: a selection or a highlight (CSS px). */
interface Anchor {
  left: number;
  top: number;
  bottom: number;
}

/**
 * Where the menu may go inside the reader body `area`: `top` just below the anchor and `above`
 * just above it (SelectionActions picks one once it knows its height), kept on screen sideways.
 */
function spot(anchor: Anchor, gap: number, area: DOMRect | undefined) {
  if (!area) return { left: anchor.left, top: anchor.bottom + gap, above: anchor.top - gap };
  const maxLeft = Math.max(MARGIN, area.width - BUTTON_WIDTH - MARGIN);
  return {
    left: Math.min(Math.max(anchor.left - area.left, MARGIN), maxLeft),
    top: anchor.bottom - area.top + gap,
    above: anchor.top - area.top - gap,
  };
}

/** The current selection's range if it holds page text, else null. */
function pageTextSelection(viewer: Viewer | null): Range | null {
  const selection = document.getSelection();
  if (!viewer || !selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  if (!normalizeQuote(selection.toString())) return null;
  const range = selection.getRangeAt(0);
  return viewer.selectionEnd(range) ? range : null;
}

/** True while focus is on the floating buttons (moving focus there can clear the selection). */
const actionsHaveFocus = () => document.activeElement?.closest('.selection-actions') != null;

interface UseHighlightsOptions {
  bookId: string | null;
  /** Bumped when another device changed data; reloads the highlights. */
  syncVersion?: number;
  store: HighlightStore;
  viewer: RefObject<Viewer | null>;
  scroller: RefObject<HTMLElement | null>;
  /** The positioned element the floating button is placed in. */
  body: RefObject<HTMLElement | null>;
  now: () => number;
  newId: () => string;
  /** Shows (or with null, clears) a readable message about a failure. */
  onError(message: string | null): void;
}

/**
 * The book's highlights: loads them, shows them in the viewer, offers "Highlight" under a text
 * selection in the pages and "Remove highlight" for a clicked highlight.
 */
export function useHighlights({
  bookId,
  syncVersion = 0,
  store,
  viewer,
  scroller,
  body,
  now,
  newId,
  onError,
}: UseHighlightsOptions) {
  const [loaded, setLoaded] = useState<
    { bookId: string; items: Highlight[] } | { bookId: string; failed: true } | null
  >(null);
  const [action, setAction] = useState<SelectionAction | null>(null);
  // The selection "Highlight" was offered for. Safari clears a selection when focus moves to a
  // button (Tab, or a tap on iOS), so pressing it uses this copy.
  const offeredRange = useRef<Range | null>(null);
  // Synchronous guard: a second activation can arrive before React renders the pending save.
  const saving = useRef(false);
  // Read by the scroll listener, which must cost nothing while no button is showing.
  const shownAction = useRef<SelectionAction | null>(null);
  useEffect(() => {
    shownAction.current = action;
  }, [action]);
  const current = loaded?.bookId === bookId ? loaded : null;
  const items = current && 'items' in current ? current.items : null;
  const unavailableReason =
    bookId === null
      ? HIGHLIGHT_UNSAVED_REASON
      : current && 'failed' in current
        ? HIGHLIGHTS_UNREADABLE
        : null;

  // Read after the viewer starts; the first page never waits for it.
  useEffect(() => {
    if (bookId === null) return;
    let cancelled = false;
    store.list(bookId).then(
      (list) => {
        if (!cancelled) setLoaded({ bookId, items: list });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error("Could not read the book's highlights", error);
        setLoaded({ bookId, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bookId, store, syncVersion]);

  useEffect(() => {
    viewer.current?.setHighlights(items ?? []);
  }, [items, viewer]);

  // Offer "Highlight" while text in the pages is selected, following the selection as it changes
  // and as the pages scroll. Scrolling drops "Remove highlight", whose highlight has moved.
  useEffect(() => {
    const follow = () => {
      const range = pageTextSelection(viewer.current);
      const end = range && viewer.current?.selectionEnd(range);
      if (range && end) {
        offeredRange.current = range.cloneRange();
        const anchor = {
          left: end.left,
          top: range.getBoundingClientRect().top,
          bottom: end.top + end.height,
        };
        setAction({ kind: 'create', ...spot(anchor, 6, body.current?.getBoundingClientRect()) });
      } else if (!actionsHaveFocus()) {
        offeredRange.current = null;
        setAction((shown) => (shown?.kind === 'create' ? null : shown));
      }
    };
    const onScroll = () => {
      const shown = shownAction.current;
      if (!shown) return;
      if (shown.kind === 'remove') setAction(null);
      else follow();
    };
    const element = scroller.current;
    document.addEventListener('selectionchange', follow);
    element?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('selectionchange', follow);
      element?.removeEventListener('scroll', onScroll);
    };
  }, [viewer, scroller, body]);

  // A relayout or page eviction removes the selected text without necessarily firing
  // selectionchange. Observe only while offering Highlight, keeping idle scrolling untouched.
  useEffect(() => {
    const element = scroller.current;
    const range = offeredRange.current;
    if (action?.kind !== 'create' || !element || !range) return;
    // Ranges are live: removal moves their endpoints to the parent. Keep the original nodes too.
    const { startContainer, endContainer } = range;
    const observer = new MutationObserver(() => {
      if (offeredRange.current !== range) return;
      if (!range.collapsed && startContainer.isConnected && endContainer.isConnected) return;
      offeredRange.current = null;
      if (actionsHaveFocus()) element.focus({ preventScroll: true });
      setAction((shown) => (shown?.kind === 'create' ? null : shown));
    });
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [action, scroller]);

  function report(error: unknown, action: 'save' | 'remove') {
    logUnexpectedAnnotationError(error, `Could not ${action} the highlight`);
    onError(annotationMessage(error, 'highlight', action));
  }

  /**
   * Highlights the selection in `color` (phase 21). The menu stays, now for the new highlight, so a
   * note can follow. Resolves to the new highlight's id, or null when nothing was saved.
   */
  async function highlightSelection(color: HighlightColor = 'yellow'): Promise<string | null> {
    if (saving.current) return null;
    const range = pageTextSelection(viewer.current) ?? offeredRange.current;
    if (bookId === null || !items || !range) return null;
    const rects = viewer.current?.selectionRects(range);
    const quote = normalizeQuote(viewer.current?.selectionText(range) ?? '');
    const first = rects?.[0];
    if (!rects || !first || !quote) {
      setAction(null);
      return null;
    }
    const highlight: Highlight = {
      id: newId(),
      bookId,
      pageIndex: first.pageIndex,
      rects,
      quote,
      createdAt: now(),
      color,
    };
    const shown = shownAction.current;
    saving.current = true;
    onError(null);
    try {
      await store.put(highlight);
      setLoaded((shown) =>
        shown?.bookId === bookId && 'items' in shown
          ? { bookId, items: sortByPosition([...shown.items, highlight]) }
          : shown,
      );
      offeredRange.current = null;
      // The menu stays where it was, for the new highlight.
      setAction(shown ? { ...shown, kind: 'remove', id: highlight.id } : null);
      document.getSelection()?.removeAllRanges();
      return highlight.id;
    } catch (error) {
      report(error, 'save');
      return null;
    } finally {
      saving.current = false;
    }
  }

  /** Gives a highlight another colour (phase 21): an ordinary edit, synced like any other. */
  async function recolour(id: string, color: HighlightColor): Promise<boolean> {
    const highlight = items?.find((item) => item.id === id);
    if (!highlight || highlight.color === color) return Boolean(highlight);
    const changed = { ...highlight, color };
    onError(null);
    try {
      await store.put(changed);
      setLoaded((shown) =>
        shown && 'items' in shown
          ? {
              bookId: shown.bookId,
              items: shown.items.map((item) => (item.id === id ? changed : item)),
            }
          : shown,
      );
      return true;
    } catch (error) {
      report(error, 'save');
      return false;
    }
  }

  /** The selected page text and the page it starts on (Copy, Share, Listen over a selection). */
  function selectedPassage(): { quote: string; pageIndex: number } | null {
    const range = pageTextSelection(viewer.current) ?? offeredRange.current;
    if (!range) return null;
    const quote = normalizeQuote(viewer.current?.selectionText(range) ?? '');
    const first = viewer.current?.selectionRects(range)?.[0];
    return quote && first ? { quote, pageIndex: first.pageIndex } : null;
  }

  async function removeHighlight(id: string) {
    onError(null);
    try {
      await store.remove(id);
      setLoaded((shown) =>
        shown && 'items' in shown
          ? { bookId: shown.bookId, items: shown.items.filter((h) => h.id !== id) }
          : shown,
      );
      setAction(null);
      scroller.current?.focus({ preventScroll: true });
      return true;
    } catch (error) {
      report(error, 'remove');
      return false;
    }
  }

  /** A click in the pages: on a highlight, offer to remove it; elsewhere, close that offer. */
  function onPagesClick(event: MouseEvent) {
    const selection = document.getSelection();
    if (selection && !selection.isCollapsed) return;
    const id = viewer.current?.highlightAt(event.clientX, event.clientY) ?? null;
    if (id) {
      // Around the whole highlight (all its lines), so the menu never covers its words.
      const lines = [
        ...(scroller.current?.querySelectorAll(
          `.highlight-box[data-highlight-id="${CSS.escape(id)}"]`,
        ) ?? []),
      ].map((box) => box.getBoundingClientRect());
      const anchor = {
        left: event.clientX - 40,
        top: Math.min(event.clientY, ...lines.map((line) => line.top)),
        bottom: Math.max(event.clientY, ...lines.map((line) => line.bottom)),
      };
      setAction({ kind: 'remove', id, ...spot(anchor, 6, body.current?.getBoundingClientRect()) });
    } else {
      setAction((shown) => (shown?.kind === 'remove' ? null : shown));
    }
  }

  /** Hides the floating button. Returns whether one was showing. */
  function dismiss(): boolean {
    if (!action) return false;
    if (actionsHaveFocus()) scroller.current?.focus({ preventScroll: true });
    offeredRange.current = null;
    setAction(null);
    return true;
  }

  return {
    items,
    action,
    unavailableReason,
    highlightSelection,
    recolour,
    selectedPassage,
    removeHighlight,
    onPagesClick,
    dismiss,
  };
}
