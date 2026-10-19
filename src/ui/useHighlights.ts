import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import {
  normalizeQuote,
  sortByPosition,
  type Highlight,
  type ScreenRect,
} from '../core/highlights';
import type { HighlightStore } from '../storage/types';
import type { Viewer } from '../viewer/viewer';
import { annotationMessage, logUnexpectedAnnotationError } from './annotation-messages';
import type { SelectionAction } from './SelectionActions';

export const HIGHLIGHT_UNSAVED_REASON = 'Highlights need this book saved on this device.';
export const HIGHLIGHTS_UNREADABLE = "This book's highlights couldn't be read.";

/** Rough size of the floating button, to keep it inside the reader. */
const BUTTON_WIDTH = 170;
const MARGIN = 8;

/** A spot inside the reader body `area`, below a screen box and kept on screen. */
function below(rect: ScreenRect, gap: number, area: DOMRect | undefined) {
  if (!area) return { left: rect.left, top: rect.top + rect.height + gap };
  const maxLeft = Math.max(MARGIN, area.width - BUTTON_WIDTH - MARGIN);
  return {
    left: Math.min(Math.max(rect.left - area.left, MARGIN), maxLeft),
    top: rect.top + rect.height - area.top + gap,
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
  }, [bookId, store]);

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
        setAction({ kind: 'create', ...below(end, 6, body.current?.getBoundingClientRect()) });
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

  async function highlightSelection() {
    if (saving.current) return;
    const range = pageTextSelection(viewer.current) ?? offeredRange.current;
    if (bookId === null || !items || !range) return;
    const rects = viewer.current?.selectionRects(range);
    const quote = normalizeQuote(viewer.current?.selectionText(range) ?? '');
    const first = rects?.[0];
    if (!rects || !first || !quote) {
      setAction(null);
      return;
    }
    const highlight: Highlight = {
      id: newId(),
      bookId,
      pageIndex: first.pageIndex,
      rects,
      quote,
      createdAt: now(),
    };
    saving.current = true;
    onError(null);
    try {
      await store.put(highlight);
      setLoaded((shown) =>
        shown?.bookId === bookId && 'items' in shown
          ? { bookId, items: sortByPosition([...shown.items, highlight]) }
          : shown,
      );
      document.getSelection()?.removeAllRanges();
      offeredRange.current = null;
      setAction(null);
      scroller.current?.focus({ preventScroll: true });
    } catch (error) {
      report(error, 'save');
    } finally {
      saving.current = false;
    }
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
    } catch (error) {
      report(error, 'remove');
    }
  }

  /** A click in the pages: on a highlight, offer to remove it; elsewhere, close that offer. */
  function onPagesClick(event: MouseEvent) {
    const selection = document.getSelection();
    if (selection && !selection.isCollapsed) return;
    const id = viewer.current?.highlightAt(event.clientX, event.clientY) ?? null;
    if (id) {
      const spot = below(
        { left: event.clientX - 40, top: event.clientY, width: 0, height: 0 },
        12,
        body.current?.getBoundingClientRect(),
      );
      setAction({ kind: 'remove', id, ...spot });
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
    action,
    unavailableReason,
    highlightSelection,
    removeHighlight,
    onPagesClick,
    dismiss,
  };
}
