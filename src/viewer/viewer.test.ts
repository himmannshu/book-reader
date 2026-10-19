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
    destroy: () => Promise.resolve(),
  };
  const started = () => renders.map((r) => r.index);
  const render = (index: number) => {
    const found = renders.find((r) => r.index === index);
    if (!found) throw new Error(`page ${index} was never started`);
    return found;
  };
  return { doc, started, render };
}

/** A scroller with a fixed size (jsdom does no layout). */
function scroller(width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  Object.defineProperty(element, 'clientWidth', { value: width });
  Object.defineProperty(element, 'clientHeight', { value: height });
  document.body.append(element);
  return element;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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
