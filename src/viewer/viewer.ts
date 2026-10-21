// Continuous-scroll PDF viewer. Plain TypeScript, outside React (D4).
// Only pages near the viewport get a canvas; pages that leave that range are cancelled and
// their canvases released, which keeps memory bounded on long books (D2).
// Each page stacks its canvas, a highlight layer and (for visible pages) a selectable text layer.
import {
  highlightAt as findHighlightAt,
  joinTextPieces,
  highlightColor,
  toPageRects,
  type Highlight,
  type HighlightRect,
  type PageOnScreen,
  type ScreenRect,
  type TextPiece,
} from '../core/highlights';
import { markPageRendered } from '../core/perf-marks';
import { zoomPercent, type ZoomSetting } from '../core/reading-state';
import { findMatches, searchable } from '../core/search';
import { RenderCancelledError, type PageSize, type PdfDoc, type RenderTask } from '../engine/types';
import {
  anchorAt,
  computeLayout,
  currentPageAt,
  pageAt,
  planRender,
  scrollTopFor,
  type Anchor,
  type Layout,
  type LayoutOptions,
} from './layout';

export interface ViewerOptions {
  layout: LayoutOptions;
  /** Extra pages drawn above and below the viewport, while memory allows. */
  overscan: number;
  /**
   * Budget for all page canvases together (width × height × 4 bytes). Visible pages are always
   * drawn; if they alone exceed it, they are drawn at a lower resolution (see planRender).
   */
  maxCanvasBytes: number;
  /** Cap on device pixel ratio for canvas resolution, to bound memory on high-DPI screens. */
  maxPixelRatio: number;
  /** Largest canvas for one page, in pixels. iOS Safari draws bigger canvases blank. */
  maxCanvasPixels: number;
  /**
   * How long scrolling must pause before visible pages get their selectable text. Laying out a
   * page's text costs main-thread time, and nobody selects text mid-scroll.
   */
  textDelayMs: number;
  /** Called with the current page (see currentPageAt) on open and whenever it changes. */
  onPageChange?: (pageIndex: number) => void;
  /**
   * Called once, when the first page has been drawn or failed to draw, so other work on the book
   * (the outline, page labels) never delays it.
   */
  onFirstPageDrawn?: () => void;
  /** How pages are sized at first (default fit width). */
  zoom?: ZoomSetting;
  /** Where to open the book: this place goes at the top of the window. */
  initialPosition?: Anchor;
  /** Where to open horizontally: the middle of the view, as a share of the content width. */
  initialCentre?: number;
}

export const defaultViewerOptions: ViewerOptions = {
  layout: { gap: 16, padding: 24, maxPageWidth: 900 },
  overscan: 1,
  maxCanvasBytes: 96_000_000,
  maxPixelRatio: 2,
  maxCanvasPixels: 16_777_216,
  textDelayMs: 200,
};

type SlotState = 'placeholder' | 'rendering' | 'rendered' | 'error';

interface Slot {
  element: HTMLDivElement;
  state: SlotState;
  canvas?: HTMLCanvasElement;
  task?: RenderTask;
  /** Pixel ratio the current canvas was drawn at. */
  pixelRatio?: number;
  /** Highlight boxes, positioned in percent of the page. Always present. */
  highlights: HTMLDivElement;
  /** Selectable text, built for visible pages once their canvas is drawn. */
  text?: HTMLDivElement;
  textTask?: RenderTask;
  /** True once the text layer has finished laying out (search matches are found in it). */
  textReady?: boolean;
  /** Search match boxes (phase 13), made on first use. */
  searchHits?: HTMLDivElement;
  /** The box over the sentence being read aloud (phase 16), made on first use. */
  spokenHits?: HTMLDivElement;
}

/** The sentence being read aloud: its text, and which of its matches on the page (0-based). */
export interface SpokenSpot {
  pageIndex: number;
  text: string;
  occurrence: number;
}

/** A search match to show as the current one: the n-th match on a page (both 0-based). */
export interface SearchSpot {
  pageIndex: number;
  occurrence: number;
}

export class Viewer {
  readonly #scroller: HTMLElement;
  readonly #doc: PdfDoc;
  readonly #options: ViewerOptions;
  readonly #content: HTMLDivElement;
  readonly #slots: Slot[];
  readonly #resizeObserver: ResizeObserver;
  #sizes: PageSize[];
  #layout: Layout = { pages: [], totalHeight: 0, width: 0 };
  #zoom: ZoomSetting;
  /** Used by the first layout instead of the scroll position. */
  #openAt: Anchor | undefined;
  #openCentre: number | undefined;
  #layoutWidth = -1;
  #viewportHeight = -1;
  #frame = 0;
  #destroyed = false;
  #firstDrawn = false;
  /** True while overscan pages wait for the visible pages to finish drawing. */
  #overscanHeld = false;
  #currentPage = -1;
  #visibleFirst = -1;
  #visibleLast = -1;
  #highlightList: readonly Highlight[] = [];
  #search: { query: string; current: SearchSpot | null; reveal: boolean } | null = null;
  #spoken: SpokenSpot | null = null;
  #textTimer: ReturnType<typeof setTimeout> | undefined;

  /** `scroller` must be a scrollable element (overflow: auto) that the viewer may fill. */
  constructor(scroller: HTMLElement, doc: PdfDoc, options: ViewerOptions = defaultViewerOptions) {
    this.#scroller = scroller;
    this.#doc = doc;
    this.#options = options;
    this.#zoom = options.zoom ?? 'fit-width';
    this.#openAt = options.initialPosition;
    this.#openCentre = options.initialCentre;
    // Until real sizes load, assume every page matches the first one. This lets page 1 draw
    // immediately instead of waiting to measure the whole book.
    this.#sizes = Array.from({ length: doc.pageCount }, () => doc.firstPageSize);

    this.#content = document.createElement('div');
    this.#content.className = 'viewer-content';
    this.#slots = this.#sizes.map((_, index) => {
      const element = document.createElement('div');
      element.className = 'viewer-page';
      element.dataset.pageIndex = String(index);
      element.dataset.state = 'placeholder';
      element.setAttribute('aria-label', `Page ${index + 1}`);
      const highlights = document.createElement('div');
      highlights.className = 'highlight-layer';
      element.append(highlights);
      this.#content.append(element);
      return { element, state: 'placeholder', highlights };
    });
    scroller.replaceChildren(this.#content);

    scroller.dataset.layout = 'estimated';
    this.#relayout();
    scroller.addEventListener('scroll', this.#onScroll, { passive: true });
    this.#resizeObserver = new ResizeObserver(() => {
      // A new width rescales every page; a new height only changes which pages are visible,
      // except in fit page, where it changes the page size too.
      const heightChanged = this.#scroller.clientHeight !== this.#viewportHeight;
      if (this.#scroller.clientWidth !== this.#layoutWidth) this.#relayout();
      else if (heightChanged && this.#zoom === 'fit-page') this.#relayout();
      else if (heightChanged) this.#update();
    });
    this.#resizeObserver.observe(scroller);

    doc.loadPageSizes().then(
      (sizes) => {
        if (this.#destroyed) return;
        this.#sizes = sizes;
        this.#relayout();
        this.#drawHighlights();
        this.#scroller.dataset.layout = 'measured';
      },
      (error: unknown) => {
        if (this.#destroyed || this.#doc.destroyed) return;
        console.error('Could not load page sizes; keeping estimated layout', error);
      },
    );
  }

  /** The page covering the most of the reader (0-based). */
  get currentPage(): number {
    return Math.max(this.#currentPage, 0);
  }

  /** The place at the top of the window. */
  get position(): Anchor {
    return (
      anchorAt(this.#layout, this.#scroller.scrollTop) ?? {
        pageIndex: 0,
        fraction: 0,
        pixelsAbove: 0,
      }
    );
  }

  /** The horizontal middle of the view, as a share of the content width (0.5 when centred). */
  get horizontalCentre(): number {
    const width = this.#layout.width;
    if (width <= 0) return 0.5;
    return Math.min(
      1,
      Math.max(0, (this.#scroller.scrollLeft + this.#scroller.clientWidth / 2) / width),
    );
  }

  get zoom(): ZoomSetting {
    return this.#zoom;
  }

  /** The zoom percentage the current page is shown at (also in fit width and fit page). */
  get zoomPercent(): number {
    const box = this.#layout.pages[this.currentPage];
    return box ? zoomPercent(box.scale) : 100;
  }

  /** Resizes the pages, keeping the reader's place. */
  setZoom(zoom: ZoomSetting): void {
    if (this.#destroyed || zoom === this.#zoom) return;
    this.#zoom = zoom;
    this.#relayout();
  }

  /** Puts a saved place at the top of the window. */
  goTo(position: Anchor): void {
    if (this.#destroyed || this.#layout.pages.length === 0) return;
    this.#scroller.scrollTop = scrollTopFor(this.#layout, position);
    this.#update();
  }

  /** Brings page `index` (0-based, clamped to the book) to the top of the reader. */
  scrollToPage(index: number): void {
    const count = this.#layout.pages.length;
    if (this.#destroyed || count === 0) return;
    const pageIndex = Math.max(0, Math.min(Math.trunc(index), count - 1));
    this.#scroller.scrollTop = scrollTopFor(this.#layout, {
      pageIndex,
      fraction: 0,
      pixelsAbove: 0,
    });
    this.#update();
  }

  /** Shows these highlights (replacing any shown before). */
  setHighlights(highlights: readonly Highlight[]): void {
    this.#highlightList = highlights;
    this.#drawHighlights();
  }

  /**
   * Marks the matches of `query` on the pages that have selectable text (null clears them). With
   * `current`, that match is marked as the current one and scrolled into view once its page's
   * text is ready.
   */
  setSearch(query: string | null, current: SearchSpot | null = null): void {
    if (this.#destroyed) return;
    this.#search =
      query !== null && searchable(query) ? { query, current, reveal: current !== null } : null;
    if (this.#search && current && !this.#slots[current.pageIndex]?.textReady) {
      this.scrollToPage(current.pageIndex);
    }
    this.#slots.forEach((slot, index) => this.#drawSearch(slot, index));
  }

  /**
   * Marks the sentence being read aloud (null clears it). Its page is brought into view when it
   * isn't drawn with text yet; on the page, the view follows the sentence.
   */
  setSpoken(spoken: SpokenSpot | null): void {
    if (this.#destroyed) return;
    const previous = this.#spoken?.pageIndex;
    this.#spoken = spoken;
    if (spoken && !this.#slots[spoken.pageIndex]?.textReady) {
      const box = this.#layout.pages[spoken.pageIndex];
      const top = this.#scroller.scrollTop;
      const visible =
        box && box.top < top + this.#scroller.clientHeight && box.top + box.height > top;
      if (!visible) this.scrollToPage(spoken.pageIndex);
    }
    for (const index of new Set([previous, spoken?.pageIndex])) {
      const slot = index === undefined ? undefined : this.#slots[index];
      if (slot && index !== undefined) this.#drawSpoken(slot, index);
    }
  }

  /** Brings a passage's first PDF-coordinate box into view, leaving a small reading margin. */
  scrollToRect(rect: HighlightRect): void {
    if (this.#destroyed) return;
    const box = this.#layout.pages[rect.pageIndex];
    if (!box) return;
    const { padding } = this.#options.layout;
    this.#scroller.scrollTop = Math.max(0, box.top + rect.y * box.scale - padding);
    // Zoomed wider than the window: bring the passage's left edge into view too.
    const x = box.left + rect.x * box.scale;
    const viewLeft = this.#scroller.scrollLeft;
    if (x < viewLeft || x > viewLeft + this.#scroller.clientWidth - padding) {
      this.#scroller.scrollLeft = Math.max(0, x - padding);
    }
    this.#update();
  }

  /**
   * The boxes of the text a range covers, in PDF points on each page, or null if it covers no
   * text in the pages. Only text in the text layers counts, never line breaks or other elements.
   */
  selectionRects(range: Range): HighlightRect[] | null {
    const rects = this.#textIn(range).flatMap((piece) => piece.rects);
    const found = toPageRects(rects, this.#pagesOnScreen());
    return found.length > 0 ? found : null;
  }

  /** The page text inside a range, with spaces between lines and pages (see joinTextPieces). */
  selectionText(range: Range): string {
    const pieces: TextPiece[] = [];
    for (const { text, pageIndex, rects } of this.#textIn(range)) {
      const first = rects[0];
      if (first) pieces.push({ text, pageIndex, top: first.top, height: first.height });
    }
    return joinTextPieces(pieces);
  }

  /** The screen box of the last selected piece of page text (to place a button by), or null. */
  selectionEnd(range: Range): ScreenRect | null {
    return this.#textIn(range).at(-1)?.rects.at(-1) ?? null;
  }

  /** The id of the newest highlight under a point on screen (client coordinates), or null. */
  highlightAt(clientX: number, clientY: number): string | null {
    for (const page of this.#pagesOnScreen()) {
      if (clientX < page.left || clientX > page.left + page.width) continue;
      if (clientY < page.top || clientY > page.top + page.height) continue;
      const x = (clientX - page.left) / page.scale;
      const y = (clientY - page.top) / page.scale;
      return findHighlightAt(this.#highlightList, page.pageIndex, x, y)?.id ?? null;
    }
    return null;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    cancelAnimationFrame(this.#frame);
    clearTimeout(this.#textTimer);
    this.#scroller.removeEventListener('scroll', this.#onScroll);
    this.#resizeObserver.disconnect();
    delete this.#scroller.dataset.layout;
    this.#slots.forEach((slot) => this.#release(slot));
    this.#content.remove();
  }

  #onScroll = () => {
    // Scrolling restarts the wait for selectable text.
    if (this.#textTimer !== undefined) this.#scheduleText();
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#update());
  };

  /** Recomputes page positions, keeping the reader's place, then redraws what is visible. */
  #relayout(): void {
    const anchor = this.#openAt ?? anchorAt(this.#layout, this.#scroller.scrollTop);
    this.#openAt = undefined;
    const width = this.#scroller.clientWidth;
    const height = this.#scroller.clientHeight;
    // Keep the middle of the view in the middle when the content gets wider or narrower.
    const previous = this.#layout;
    const centre =
      this.#openCentre ??
      (previous.width > 0 ? (this.#scroller.scrollLeft + width / 2) / previous.width : 0.5);
    this.#openCentre = undefined;
    const scaleChanged = width !== this.#layoutWidth;
    this.#layoutWidth = width;
    this.#layout = computeLayout(this.#sizes, width, this.#options.layout, {
      zoom: this.#zoom,
      viewportHeight: height,
    });

    this.#content.style.height = `${this.#layout.totalHeight}px`;
    this.#content.style.width = `${this.#layout.width}px`;
    this.#layout.pages.forEach((box, index) => {
      const slot = this.#slots[index];
      if (!slot) return;
      const style = slot.element.style;
      style.top = `${box.top}px`;
      style.left = `${box.left}px`;
      style.width = `${box.width}px`;
      style.height = `${box.height}px`;
      // A page whose drawn resolution no longer matches must be drawn again.
      const old = previous.pages[index];
      if (scaleChanged || !old || old.scale !== box.scale) this.#release(slot);
    });

    if (anchor) this.#scroller.scrollTop = scrollTopFor(this.#layout, anchor);
    this.#scroller.scrollLeft = Math.max(0, centre * this.#layout.width - width / 2);
    this.#update();
  }

  #update(): void {
    if (this.#destroyed) return;
    this.#viewportHeight = this.#scroller.clientHeight;
    this.#reportCurrentPage();
    const plan = planRender(this.#layout, this.#scroller.scrollTop, this.#scroller.clientHeight, {
      overscan: this.#options.overscan,
      pixelRatio: Math.min(window.devicePixelRatio || 1, this.#options.maxPixelRatio),
      maxCanvasBytes: this.#options.maxCanvasBytes,
      maxCanvasPixels: this.#options.maxCanvasPixels,
    });
    // Release first, so memory is freed before new canvases are allocated.
    this.#slots.forEach((slot, index) => {
      const inPlan = plan !== null && index >= plan.first && index <= plan.last;
      if (!inPlan || (slot.pixelRatio !== undefined && slot.pixelRatio !== plan.pixelRatio)) {
        this.#release(slot);
      }
    });
    this.#visibleFirst = plan?.visibleFirst ?? -1;
    this.#visibleLast = plan?.visibleLast ?? -1;
    if (!plan) return;
    let visibleDone = true;
    for (let i = plan.visibleFirst; i <= plan.visibleLast; i++) {
      const slot = this.#slots[i];
      if (slot?.state === 'placeholder') this.#render(slot, i, plan.pixelRatio);
      if (slot?.state === 'rendering') visibleDone = false;
      // A page drawn as overscan gets its text once it scrolls into view.
      if (slot?.state === 'rendered' && !slot.text) this.#scheduleText();
    }
    // Overscan pages start only once the visible pages are drawn. PDF.js decodes in a single
    // worker, so a costly neighbour (one big image) would otherwise delay the page the reader
    // is looking at by hundreds of ms. The visible page that finishes last resumes them.
    this.#overscanHeld = !visibleDone;
    if (this.#overscanHeld) return;
    for (let i = plan.first; i <= plan.last; i++) {
      const slot = this.#slots[i];
      if (slot?.state === 'placeholder') this.#render(slot, i, plan.pixelRatio);
    }
  }

  #reportCurrentPage(): void {
    const page = currentPageAt(this.#layout, this.#scroller.scrollTop, this.#viewportHeight);
    if (page === null || page === this.#currentPage) return;
    this.#currentPage = page;
    this.#options.onPageChange?.(page);
  }

  #reportFirstDraw(): void {
    if (this.#firstDrawn) return;
    this.#firstDrawn = true;
    this.#options.onFirstPageDrawn?.();
  }

  #render(slot: Slot, index: number, pixelRatio: number): void {
    const box = pageAt(this.#layout, index);
    const canvas = document.createElement('canvas');
    slot.element.prepend(canvas);
    const task = this.#doc.renderPage(index, canvas, box.scale * pixelRatio);
    slot.canvas = canvas;
    slot.task = task;
    slot.pixelRatio = pixelRatio;
    this.#setState(slot, 'rendering');

    task.promise.then(
      () => {
        if (slot.task !== task) return;
        this.#setState(slot, 'rendered');
        markPageRendered(index);
        this.#reportFirstDraw();
        if (index >= this.#visibleFirst && index <= this.#visibleLast) this.#scheduleText();
        // Only when needed: #update reads layout, which costs a frame mid-scroll.
        if (this.#overscanHeld) this.#update();
      },
      (error: unknown) => {
        if (slot.task !== task || error instanceof RenderCancelledError) return;
        if (this.#destroyed || this.#doc.destroyed) return;
        console.error(`Could not draw page ${index + 1}`, error);
        this.#reportFirstDraw();
        this.#setState(slot, 'error');
        if (this.#overscanHeld) this.#update();
      },
    );
  }

  /** Gives visible, drawn pages their selectable text once scrolling has paused. */
  #scheduleText(): void {
    clearTimeout(this.#textTimer);
    this.#textTimer = setTimeout(() => {
      this.#textTimer = undefined;
      if (this.#destroyed) return;
      for (let i = this.#visibleFirst; i >= 0 && i <= this.#visibleLast; i++) {
        const slot = this.#slots[i];
        if (slot?.state === 'rendered' && !slot.text) this.#renderText(slot, i);
      }
    }, this.#options.textDelayMs);
  }

  /** Lays out the page's selectable text over its canvas, at the layout scale. */
  #renderText(slot: Slot, index: number): void {
    const text = document.createElement('div');
    slot.element.append(text);
    const task = this.#doc.renderTextLayer(index, text, pageAt(this.#layout, index).scale);
    slot.text = text;
    slot.textTask = task;
    task.promise.then(
      () => {
        if (slot.textTask !== task) return;
        slot.textReady = true;
        if (this.#search) this.#drawSearch(slot, index);
        if (this.#spoken?.pageIndex === index) this.#drawSpoken(slot, index);
      },
      () => undefined,
    );
    task.promise.catch((error: unknown) => {
      if (slot.textTask !== task || error instanceof RenderCancelledError) return;
      if (this.#destroyed || this.#doc.destroyed) return;
      // The page still reads fine; only selecting its text won't work.
      console.error(`Could not lay out the text of page ${index + 1}`, error);
    });
  }

  #releaseText(slot: Slot): void {
    slot.textTask?.cancel();
    slot.textTask = undefined;
    slot.textReady = false;
    slot.searchHits?.replaceChildren();
    slot.spokenHits?.replaceChildren();
    slot.text?.remove();
    slot.text = undefined;
  }

  /** The pieces of page text inside a range, in document order, with their screen boxes. */
  #textIn(range: Range): { text: string; pageIndex: number; rects: ScreenRect[] }[] {
    const pieces: { text: string; pageIndex: number; rects: ScreenRect[] }[] = [];
    const root = range.commonAncestorContainer;
    if (this.#destroyed || !this.#content.contains(root)) return pieces;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node: Node | null = walker.currentNode; node; node = walker.nextNode()) {
      if (!(node instanceof Text) || !range.intersectsNode(node)) continue;
      const page = node.parentElement
        ?.closest<HTMLElement>('.textLayer')
        ?.closest<HTMLElement>('[data-page-index]');
      if (!page) continue;
      const part = document.createRange();
      part.selectNodeContents(node);
      if (node === range.startContainer) part.setStart(node, range.startOffset);
      if (node === range.endContainer) part.setEnd(node, range.endOffset);
      // Left and right from the selected characters; top and height from the text's own box,
      // which scales exactly (browsers round selection boxes to whole pixels).
      const line = node.parentElement?.getBoundingClientRect();
      const rects = [...part.getClientRects()]
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) =>
          line && line.height > 0
            ? { left: r.left, width: r.width, top: line.top, height: line.height }
            : r,
        );
      if (rects.length === 0) continue;
      pieces.push({ text: part.toString(), pageIndex: Number(page.dataset.pageIndex), rects });
    }
    return pieces;
  }

  /** Where each page with a canvas is on screen, and its scale (CSS px per point). */
  #pagesOnScreen(): PageOnScreen[] {
    const pages: PageOnScreen[] = [];
    this.#slots.forEach((slot, pageIndex) => {
      const size = this.#sizes[pageIndex];
      if (!slot.canvas || !size) return;
      const { left, top, width, height } = slot.element.getBoundingClientRect();
      if (width === 0) return;
      pages.push({ pageIndex, left, top, width, height, scale: width / size.width });
    });
    return pages;
  }

  #drawHighlights(): void {
    const byPage = new Map<number, { id: string; color: string; rect: HighlightRect }[]>();
    for (const highlight of this.#highlightList) {
      const color = highlightColor(highlight);
      for (const rect of highlight.rects) {
        const list = byPage.get(rect.pageIndex) ?? [];
        list.push({ id: highlight.id, color, rect });
        byPage.set(rect.pageIndex, list);
      }
    }
    this.#slots.forEach((slot, pageIndex) => {
      const size = this.#sizes[pageIndex];
      const boxes = (size && byPage.get(pageIndex)) || [];
      if (boxes.length === 0 && !slot.highlights.firstChild) return;
      slot.highlights.replaceChildren(
        ...boxes.map(({ id, color, rect }) => {
          const box = document.createElement('div');
          // Its colour's fill (phase 21): a class, so a theme change needs no redraw.
          box.className = `highlight-box highlight-box--${color}`;
          box.dataset.highlightId = id;
          const percent = (value: number, of: number) => `${(value / of) * 100}%`;
          box.style.left = percent(rect.x, size?.width ?? 1);
          box.style.top = percent(rect.y, size?.height ?? 1);
          box.style.width = percent(rect.width, size?.width ?? 1);
          box.style.height = percent(rect.height, size?.height ?? 1);
          return box;
        }),
      );
    });
  }

  /** Boxes over this page's search matches, found in its text layer (only visible pages). */
  /**
   * Where each match of `query` is in this page's text layer: one list of screen boxes per match,
   * in order. The text is the layer's text nodes, with a line break per <br>.
   */
  #textLayerMatches(slot: Slot, query: string): DOMRect[][] {
    if (!slot.text) return [];
    const nodes: Text[] = [];
    const starts: number[] = [];
    let full = '';
    const walker = document.createTreeWalker(
      slot.text,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node instanceof Text) {
        starts.push(full.length);
        nodes.push(node);
        full += node.data;
      } else if (node instanceof HTMLBRElement) {
        full += '\n';
      }
    }
    const at = (offset: number, isEnd: boolean): [Text, number] | null => {
      let index = -1;
      for (let i = 0; i < nodes.length && (starts[i] ?? 0) <= offset; i++) index = i;
      const node = nodes[index];
      if (!node) return null;
      const within = offset - (starts[index] ?? 0);
      // An offset in a line break between nodes: end at the node before, start at the next.
      if (within > node.data.length) {
        const next = nodes[index + 1];
        return isEnd || !next ? [node, node.data.length] : [next, 0];
      }
      return [node, within];
    };
    return findMatches(full, query).map((match) => {
      const start = at(match.start, false);
      const end = at(match.end, true);
      if (!start || !end) return [];
      const range = document.createRange();
      range.setStart(...start);
      range.setEnd(...end);
      return [...range.getClientRects()].filter((rect) => rect.width >= 1 && rect.height >= 1);
    });
  }

  /** Boxes in percent of the page, so they follow any later resize until redrawn. */
  #boxes(slot: Slot, rects: readonly DOMRect[], className: string): HTMLDivElement[] {
    const page = slot.element.getBoundingClientRect();
    if (page.width === 0) return [];
    const percent = (value: number, of: number) => `${(value / of) * 100}%`;
    return rects.map((rect) => {
      const box = document.createElement('div');
      box.className = className;
      box.style.left = percent(rect.left - page.left, page.width);
      box.style.top = percent(rect.top - page.top, page.height);
      box.style.width = percent(rect.width, page.width);
      box.style.height = percent(rect.height, page.height);
      return box;
    });
  }

  /** Scrolls so a box on screen is about a third of the way down the window. */
  #reveal(rect: DOMRect): void {
    const view = this.#scroller.getBoundingClientRect();
    this.#scroller.scrollTop += rect.top - view.top - this.#scroller.clientHeight / 3;
    if (rect.left < view.left || rect.right > view.right) {
      this.#scroller.scrollLeft += rect.left - view.left - this.#options.layout.padding;
    }
  }

  /** A layer over the page for marks (search matches, the spoken sentence), made on first use. */
  #layer(slot: Slot, key: 'searchHits' | 'spokenHits', className: string): HTMLDivElement {
    let layer = slot[key];
    if (!layer) {
      layer = document.createElement('div');
      layer.className = className;
      slot.highlights.after(layer);
      slot[key] = layer;
    }
    return layer;
  }

  /** Boxes over this page's search matches, found in its text layer (only visible pages). */
  #drawSearch(slot: Slot, pageIndex: number): void {
    const search = this.#search;
    if (!search || !slot.text || !slot.textReady) {
      slot.searchHits?.replaceChildren();
      return;
    }
    const current = search.current?.pageIndex === pageIndex ? search.current.occurrence : -1;
    const boxes: HTMLDivElement[] = [];
    let currentBox: DOMRect | undefined;
    this.#textLayerMatches(slot, search.query).forEach((rects, occurrence) => {
      const isCurrent = occurrence === current;
      boxes.push(...this.#boxes(slot, rects, isCurrent ? 'search-hit current' : 'search-hit'));
      if (isCurrent) currentBox ??= rects[0];
    });
    this.#layer(slot, 'searchHits', 'search-layer').replaceChildren(...boxes);
    if (search.reveal && currentBox) {
      search.reveal = false;
      this.#reveal(currentBox);
    }
  }

  /** The sentence being read aloud (phase 16), followed on screen when it moves out of view. */
  #drawSpoken(slot: Slot, pageIndex: number): void {
    const spoken = this.#spoken;
    if (!spoken || spoken.pageIndex !== pageIndex || !slot.text || !slot.textReady) {
      slot.spokenHits?.replaceChildren();
      return;
    }
    const rects = this.#textLayerMatches(slot, spoken.text)[spoken.occurrence] ?? [];
    this.#layer(slot, 'spokenHits', 'spoken-layer').replaceChildren(
      ...this.#boxes(slot, rects, 'spoken-hit'),
    );
    const first = rects[0];
    const last = rects.at(-1);
    if (!first || !last) return;
    const view = this.#scroller.getBoundingClientRect();
    if (first.top < view.top || last.bottom > view.bottom) this.#reveal(first);
  }

  /** Cancels any drawing and frees the canvas memory. Safe to call on any slot. */
  #release(slot: Slot): void {
    this.#releaseText(slot);
    slot.task?.cancel();
    slot.task = undefined;
    slot.pixelRatio = undefined;
    if (slot.canvas) {
      // Shrinking first makes Safari free the backing store immediately.
      slot.canvas.width = 0;
      slot.canvas.height = 0;
      slot.canvas.remove();
      slot.canvas = undefined;
    }
    this.#setState(slot, 'placeholder');
  }

  #setState(slot: Slot, state: SlotState): void {
    slot.state = state;
    slot.element.dataset.state = state;
    // A page that failed to draw says so instead of staying blank (phase 01 review B3).
    const message = slot.element.querySelector(':scope > .page-error');
    if (state === 'error' && !message) {
      const note = document.createElement('p');
      note.className = 'page-error';
      note.textContent = "This page couldn't be drawn.";
      slot.element.append(note);
    } else if (state !== 'error') {
      message?.remove();
    }
  }
}
