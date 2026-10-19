import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageSize, PdfDoc, RenderTask } from '../engine/types';
import { Viewer, defaultViewerOptions } from './viewer';

interface PendingRender {
  index: number;
  finish(): void;
  fail(error: Error): void;
}

/** A PdfDoc whose page draws finish only when the test says so. */
function fakeDoc(pageCount: number, size: PageSize = { width: 500, height: 700 }) {
  const renders: PendingRender[] = [];
  const textLayers: { index: number; scale: number; cancelled: boolean }[] = [];
  const doc: PdfDoc = {
    pageCount,
    destroyed: false,
    firstPageSize: size,
    loadPageSizes: () => Promise.resolve(Array.from({ length: pageCount }, () => size)),
    renderPage(index): RenderTask {
      let finish!: () => void;
      let fail!: (error: Error) => void;
      const promise = new Promise<void>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      });
      renders.push({ index, finish, fail });
      return { promise, cancel: () => undefined };
    },
    renderTextLayer(index, _container, scale): RenderTask {
      const layer = { index, scale, cancelled: false };
      textLayers.push(layer);
      return {
        promise: new Promise(() => {}),
        cancel: () => {
          layer.cancelled = true;
        },
      };
    },
    outline: () => Promise.resolve([]),
    destroy: () => Promise.resolve(),
  };
  const started = () => renders.map((r) => r.index);
  /** Pages whose text layer was requested and not cancelled. */
  const liveText = () => textLayers.filter((l) => !l.cancelled).map((l) => l.index);
  const render = (index: number) => {
    const found = renders.find((r) => r.index === index);
    if (!found) throw new Error(`page ${index} was never started`);
    return found;
  };
  return { doc, started, render, liveText, textLayers };
}

/** A scroller with a fixed size and a remembered scroll position (jsdom does no layout). */
function scroller(width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  Object.defineProperty(element, 'clientWidth', { value: width });
  Object.defineProperty(element, 'clientHeight', { value: height });
  let scrollTop = 0;
  Object.defineProperty(element, 'scrollTop', {
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });
  document.body.append(element);
  return element;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Text layers right away, so tests only wait for timers to run. */
const noTextDelay = { ...defaultViewerOptions, textDelayMs: 0 };

describe('Viewer drawing order', () => {
  let viewer: Viewer | undefined;

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    viewer?.destroy();
    viewer = undefined;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  // One costly neighbour (a page with a big image) used to delay page 1 by hundreds of ms,
  // because both drew at once and PDF.js decodes in a single worker.
  it('starts overscan pages only after the visible pages are drawn', async () => {
    // 900 px wide pages are 1260 px tall: only page 0 is visible in a 600 px viewport.
    const { doc, started, render } = fakeDoc(5);
    viewer = new Viewer(scroller(1000, 600), doc, defaultViewerOptions);
    expect(started()).toEqual([0]);

    render(0).finish();
    await flush();
    expect(started()).toEqual([0, 1]);
  });

  it('still starts overscan pages when a visible page fails to draw', async () => {
    const { doc, started, render } = fakeDoc(5);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    viewer = new Viewer(scroller(1000, 600), doc, defaultViewerOptions);

    render(0).fail(new Error('broken page'));
    await flush();
    expect(started()).toEqual([0, 1]);
  });

  it('waits for every visible page, not just the first', async () => {
    // A 3000 px viewport shows pages 0–2; overscan adds page 3.
    const { doc, started, render } = fakeDoc(6);
    viewer = new Viewer(scroller(1000, 3000), doc, defaultViewerOptions);
    expect(started()).toEqual([0, 1, 2]);

    render(0).finish();
    render(2).finish();
    await flush();
    expect(started()).toEqual([0, 1, 2]);

    render(1).finish();
    await flush();
    expect(started()).toEqual([0, 1, 2, 3]);
  });
});

describe('Viewer.scrollToPage', () => {
  let viewer: Viewer | undefined;

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    viewer?.destroy();
    viewer = undefined;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('puts the chosen page at the top of the reader and starts drawing it', () => {
    // 1000 px wide: pages are 900 px wide and 1260 px tall, 16 px apart, 24 px padding.
    const { doc, started } = fakeDoc(10);
    const element = scroller(1000, 600);
    viewer = new Viewer(element, doc, defaultViewerOptions);

    viewer.scrollToPage(3);

    expect(element.scrollTop).toBe(24 + 3 * (1260 + 16));
    expect(started()).toContain(3);
  });

  it('clamps a page index outside the book', () => {
    const { doc } = fakeDoc(4);
    const element = scroller(1000, 600);
    viewer = new Viewer(element, doc, defaultViewerOptions);

    viewer.scrollToPage(99);
    expect(element.scrollTop).toBe(24 + 3 * (1260 + 16));
    viewer.scrollToPage(-5);
    expect(element.scrollTop).toBe(24);
  });
});

describe('Viewer current page', () => {
  let viewer: Viewer | undefined;

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    viewer?.destroy();
    viewer = undefined;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('reports the first page on open, then each new page once', () => {
    const { doc } = fakeDoc(10);
    const onPageChange = vi.fn();
    viewer = new Viewer(scroller(1000, 600), doc, { ...defaultViewerOptions, onPageChange });
    expect(onPageChange.mock.calls).toEqual([[0]]);
    expect(viewer.currentPage).toBe(0);

    viewer.scrollToPage(3);
    viewer.scrollToPage(3);
    expect(onPageChange.mock.calls).toEqual([[0], [3]]);
    expect(viewer.currentPage).toBe(3);
  });

  it('follows scrolling', async () => {
    const { doc } = fakeDoc(10);
    const onPageChange = vi.fn();
    const element = scroller(1000, 600);
    viewer = new Viewer(element, doc, { ...defaultViewerOptions, onPageChange });

    // Pages are 1260 px tall, 16 px apart, 24 px padding: at 2000 page 1 fills the viewport.
    element.scrollTop = 2000;
    element.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('stops reporting after destroy', () => {
    const { doc } = fakeDoc(10);
    const onPageChange = vi.fn();
    viewer = new Viewer(scroller(1000, 600), doc, { ...defaultViewerOptions, onPageChange });
    viewer.destroy();
    viewer.scrollToPage(5);
    expect(onPageChange.mock.calls).toEqual([[0]]);
  });
});

describe('Viewer text and highlights', () => {
  let viewer: Viewer | undefined;

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    viewer?.destroy();
    viewer = undefined;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('builds the text layer only for visible pages, after their canvas is drawn', async () => {
    // 1000 px wide pages are 1260 px tall: only page 0 is visible; page 1 is overscan.
    const { doc, render, liveText, textLayers } = fakeDoc(5);
    viewer = new Viewer(scroller(1000, 600), doc, noTextDelay);
    expect(liveText()).toEqual([]);

    render(0).finish();
    await wait(5);
    expect(liveText()).toEqual([0]);
    // At the layout scale (CSS px per point), not the canvas resolution.
    expect(textLayers[0]?.scale).toBeCloseTo(900 / 500);

    render(1).finish();
    await wait(5);
    expect(liveText()).toEqual([0]);
  });

  it('waits until scrolling pauses before building the text layer', async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    try {
      const { doc, render, liveText } = fakeDoc(10);
      const element = scroller(1000, 600);
      viewer = new Viewer(element, doc, { ...defaultViewerOptions, textDelayMs: 100 });
      render(0).finish();
      await Promise.resolve(); // let the drawn page report back
      vi.advanceTimersByTime(60);
      expect(liveText()).toEqual([]);
      // Scrolling restarts the wait.
      element.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(80);
      expect(liveText()).toEqual([]);
      vi.advanceTimersByTime(100);
      expect(liveText()).toEqual([0]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops the text layer with the page when it scrolls away', async () => {
    const { doc, render, liveText } = fakeDoc(10);
    viewer = new Viewer(scroller(1000, 600), doc, noTextDelay);
    render(0).finish();
    await wait(5);
    expect(liveText()).toEqual([0]);

    viewer.scrollToPage(6);
    expect(liveText()).toEqual([]);
    render(6).finish();
    await wait(5);
    expect(liveText()).toEqual([6]);
  });

  it('draws highlight boxes in percent of the page, so they follow any scale', () => {
    const { doc } = fakeDoc(3);
    const element = scroller(1000, 600);
    viewer = new Viewer(element, doc, defaultViewerOptions);
    viewer.setHighlights([
      {
        id: 'h',
        bookId: 'b',
        pageIndex: 1,
        rects: [{ pageIndex: 1, x: 50, y: 70, width: 250, height: 35 }],
        quote: 'q',
        createdAt: 1,
      },
    ]);
    const boxes = element.querySelectorAll<HTMLElement>(
      '[data-page-index="1"] .highlight-layer .highlight-box',
    );
    expect(boxes).toHaveLength(1);
    const box = boxes[0];
    expect([box?.style.left, box?.style.top, box?.style.width, box?.style.height]).toEqual([
      '10%',
      '10%',
      '50%',
      '5%',
    ]);
    expect(box?.dataset.highlightId).toBe('h');
    expect(element.querySelectorAll('[data-page-index="0"] .highlight-box')).toHaveLength(0);

    viewer.setHighlights([]);
    expect(element.querySelectorAll('.highlight-box')).toHaveLength(0);
  });
});
