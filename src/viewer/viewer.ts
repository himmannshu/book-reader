// Continuous-scroll PDF viewer. Plain TypeScript, outside React (D4).
// Only pages near the viewport get a canvas; pages that leave that range are cancelled and
// their canvases released, which keeps memory bounded on long books (D2).
// Each page stacks its canvas, a highlight layer and (for visible pages) a selectable text layer.
import {
  highlightAt as findHighlightAt,
  joinTextPieces,
  toPageRects,
  type Highlight,
  type HighlightRect,
  type PageOnScreen,
  type ScreenRect,
  type TextPiece,
} from '../core/highlights';
import { markPageRendered } from '../core/perf-marks';
import { RenderCancelledError, type PageSize, type PdfDoc, type RenderTask } from '../engine/types';
import {
  anchorAt,
  computeLayout,
  currentPageAt,
  pageAt,
  planRender,
  scrollTopFor,
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
  /** Called with the current page (see currentPageAt) on open and whenever it changes. */
  onPageChange?: (pageIndex: number) => void;
}

export const defaultViewerOptions: ViewerOptions = {
  layout: { gap: 16, padding: 24, maxPageWidth: 900 },
  overscan: 1,
  maxCanvasBytes: 96_000_000,
  maxPixelRatio: 2,
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
}

export class Viewer {
  readonly #scroller: HTMLElement;
  readonly #doc: PdfDoc;
  readonly #options: ViewerOptions;
  readonly #content: HTMLDivElement;
  readonly #slots: Slot[];
  readonly #resizeObserver: ResizeObserver;
  #sizes: PageSize[];
  #layout: Layout = { pages: [], totalHeight: 0 };
  #layoutWidth = -1;
  #viewportHeight = -1;
  #frame = 0;
  #destroyed = false;
  /** True while overscan pages wait for the visible pages to finish drawing. */
  #overscanHeld = false;
  #currentPage = -1;
  #visibleFirst = -1;
  #visibleLast = -1;
  #highlightList: readonly Highlight[] = [];

  /** `scroller` must be a scrollable element (overflow: auto) that the viewer may fill. */
  constructor(scroller: HTMLElement, doc: PdfDoc, options: ViewerOptions = defaultViewerOptions) {
    this.#scroller = scroller;
    this.#doc = doc;
    this.#options = options;
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
      // A new width rescales every page; a new height only changes which pages are visible.
      if (this.#scroller.clientWidth !== this.#layoutWidth) this.#relayout();
      else if (this.#scroller.clientHeight !== this.#viewportHeight) this.#update();
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
    this.#scroller.removeEventListener('scroll', this.#onScroll);
    this.#resizeObserver.disconnect();
    delete this.#scroller.dataset.layout;
    this.#slots.forEach((slot) => this.#release(slot));
    this.#content.remove();
  }

  #onScroll = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#update());
  };

  /** Recomputes page positions, keeping the reader's place, then redraws what is visible. */
  #relayout(): void {
    const anchor = anchorAt(this.#layout, this.#scroller.scrollTop);
    const width = this.#scroller.clientWidth;
    const scaleChanged = width !== this.#layoutWidth;
    this.#layoutWidth = width;
    const previous = this.#layout;
    this.#layout = computeLayout(this.#sizes, width, this.#options.layout);

    this.#content.style.height = `${this.#layout.totalHeight}px`;
    this.#layout.pages.forEach((box, index) => {
      const slot = this.#slots[index];
      if (!slot) return;
      const style = slot.element.style;
      style.top = `${box.top}px`;
      style.width = `${box.width}px`;
      style.height = `${box.height}px`;
      // A page whose drawn resolution no longer matches must be drawn again.
      const old = previous.pages[index];
      if (scaleChanged || !old || old.scale !== box.scale) this.#release(slot);
    });

    if (anchor) this.#scroller.scrollTop = scrollTopFor(this.#layout, anchor);
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
      if (slot?.state === 'rendered' && !slot.text) this.#renderText(slot, i);
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
        if (index >= this.#visibleFirst && index <= this.#visibleLast)
          this.#renderText(slot, index);
        // Only when needed: #update reads layout, which costs a frame mid-scroll.
        if (this.#overscanHeld) this.#update();
      },
      (error: unknown) => {
        if (slot.task !== task || error instanceof RenderCancelledError) return;
        if (this.#destroyed || this.#doc.destroyed) return;
        console.error(`Could not draw page ${index + 1}`, error);
        this.#setState(slot, 'error');
        if (this.#overscanHeld) this.#update();
      },
    );
  }

  /** Lays out the page's selectable text over its canvas, at the layout scale. */
  #renderText(slot: Slot, index: number): void {
    const text = document.createElement('div');
    slot.element.append(text);
    const task = this.#doc.renderTextLayer(index, text, pageAt(this.#layout, index).scale);
    slot.text = text;
    slot.textTask = task;
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
    const byPage = new Map<number, { id: string; rect: HighlightRect }[]>();
    for (const highlight of this.#highlightList) {
      for (const rect of highlight.rects) {
        const list = byPage.get(rect.pageIndex) ?? [];
        list.push({ id: highlight.id, rect });
        byPage.set(rect.pageIndex, list);
      }
    }
    this.#slots.forEach((slot, pageIndex) => {
      const size = this.#sizes[pageIndex];
      const boxes = (size && byPage.get(pageIndex)) || [];
      if (boxes.length === 0 && !slot.highlights.firstChild) return;
      slot.highlights.replaceChildren(
        ...boxes.map(({ id, rect }) => {
          const box = document.createElement('div');
          box.className = 'highlight-box';
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
  }
}
