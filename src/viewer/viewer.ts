// Continuous-scroll PDF viewer. Plain TypeScript, outside React (D4).
// Only pages near the viewport get a canvas; pages that leave that range are cancelled and
// their canvases released, which keeps memory bounded on long books (D2).
import { RenderCancelledError, type PageSize, type PdfDoc, type RenderTask } from '../engine/types';
import {
  anchorAt,
  computeLayout,
  pageAt,
  scrollTopFor,
  visibleRange,
  type Layout,
  type LayoutOptions,
} from './layout';

export interface ViewerOptions {
  layout: LayoutOptions;
  /** Extra pages drawn above and below the viewport. */
  overscan: number;
  /** Hard cap on drawn pages at any time. */
  maxRenderedPages: number;
  /** Cap on device pixel ratio for canvas resolution, to bound memory on high-DPI screens. */
  maxPixelRatio: number;
}

export const defaultViewerOptions: ViewerOptions = {
  layout: { gap: 16, padding: 24, maxPageWidth: 900 },
  overscan: 1,
  maxRenderedPages: 8,
  maxPixelRatio: 2,
};

type SlotState = 'placeholder' | 'rendering' | 'rendered' | 'error';

interface Slot {
  element: HTMLDivElement;
  state: SlotState;
  canvas?: HTMLCanvasElement;
  task?: RenderTask;
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
      this.#content.append(element);
      return { element, state: 'placeholder' };
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
        this.#scroller.dataset.layout = 'measured';
      },
      (error: unknown) => {
        if (this.#destroyed || this.#doc.destroyed) return;
        console.error('Could not load page sizes; keeping estimated layout', error);
      },
    );
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
    const range = visibleRange(
      this.#layout,
      this.#scroller.scrollTop,
      this.#scroller.clientHeight,
      this.#options.overscan,
      this.#options.maxRenderedPages,
    );
    this.#slots.forEach((slot, index) => {
      const inRange = range !== null && index >= range.first && index <= range.last;
      if (!inRange) this.#release(slot);
      else if (slot.state === 'placeholder') this.#render(slot, index);
    });
  }

  #render(slot: Slot, index: number): void {
    const box = pageAt(this.#layout, index);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.#options.maxPixelRatio);
    const canvas = document.createElement('canvas');
    slot.element.append(canvas);
    const task = this.#doc.renderPage(index, canvas, box.scale * pixelRatio);
    slot.canvas = canvas;
    slot.task = task;
    this.#setState(slot, 'rendering');

    task.promise.then(
      () => {
        if (slot.task === task) this.#setState(slot, 'rendered');
      },
      (error: unknown) => {
        if (slot.task !== task || error instanceof RenderCancelledError) return;
        if (this.#destroyed || this.#doc.destroyed) return;
        console.error(`Could not draw page ${index + 1}`, error);
        this.#setState(slot, 'error');
      },
    );
  }

  /** Cancels any drawing and frees the canvas memory. Safe to call on any slot. */
  #release(slot: Slot): void {
    slot.task?.cancel();
    slot.task = undefined;
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
