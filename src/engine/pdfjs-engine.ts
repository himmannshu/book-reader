// PDF.js adapter for the engine interface. This is the only module allowed to import pdfjs-dist.
// PDF.js parses and decodes in its own Web Worker; drawing onto the canvas happens here.
import { GlobalWorkerOptions, TextLayer, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { resolveOutline, type RawOutlineItem } from './outline';
import './text-layer.css';
import { trackTextLayer, untrackTextLayer } from './text-selection';
import {
  PdfOpenError,
  RenderCancelledError,
  type PageSize,
  type PdfDoc,
  type OutlineItem,
  type PdfEngine,
  type RenderTask,
} from './types';

GlobalWorkerOptions.workerSrc = workerUrl;

function errorName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined;
}

function toOpenError(error: unknown): PdfOpenError {
  switch (errorName(error)) {
    case 'InvalidPDFException':
      return new PdfOpenError('invalid', 'Not a valid PDF', { cause: error });
    case 'PasswordException':
      return new PdfOpenError('password', 'The PDF is password-protected', { cause: error });
    default:
      return new PdfOpenError('unknown', 'The PDF could not be opened', { cause: error });
  }
}

async function sizeOfPage(doc: PDFDocumentProxy, pageNumber: number): Promise<PageSize> {
  const page = await doc.getPage(pageNumber);
  const { width, height } = page.getViewport({ scale: 1 });
  return { width, height };
}

class PdfjsDoc implements PdfDoc {
  readonly pageCount: number;
  readonly firstPageSize: PageSize;
  #doc: PDFDocumentProxy;
  #destroyed = false;

  constructor(doc: PDFDocumentProxy, firstPageSize: PageSize) {
    this.#doc = doc;
    this.pageCount = doc.numPages;
    this.firstPageSize = firstPageSize;
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  loadPageSizes(): Promise<PageSize[]> {
    const pageNumbers = Array.from({ length: this.pageCount }, (_, i) => i + 1);
    return Promise.all(pageNumbers.map((n) => sizeOfPage(this.#doc, n)));
  }

  renderPage(index: number, canvas: HTMLCanvasElement, scale: number): RenderTask {
    let cancelled = false;
    let pdfjsTask: { cancel(): void } | undefined;

    const promise = (async () => {
      const page = await this.#doc.getPage(index + 1);
      if (cancelled) throw new RenderCancelledError();
      const viewport = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const task = page.render({ canvas, viewport });
      pdfjsTask = task;
      try {
        await task.promise;
      } catch (error) {
        if (errorName(error) === 'RenderingCancelledException') throw new RenderCancelledError();
        throw error;
      }
    })();

    return {
      promise,
      cancel() {
        cancelled = true;
        pdfjsTask?.cancel();
      },
    };
  }

  renderTextLayer(index: number, container: HTMLElement, scale: number): RenderTask {
    let cancelled = false;
    let layer: TextLayer | undefined;

    const promise = (async () => {
      const page = await this.#doc.getPage(index + 1);
      if (cancelled) throw new RenderCancelledError();
      container.classList.add('textLayer');
      container.style.setProperty('--total-scale-factor', String(scale));
      layer = new TextLayer({
        textContentSource: page.streamTextContent({ includeMarkedContent: true }),
        container,
        viewport: page.getViewport({ scale }),
      });
      try {
        await layer.render();
      } catch (error) {
        if (cancelled || errorName(error) === 'AbortException') throw new RenderCancelledError();
        throw error;
      }
      if (cancelled) throw new RenderCancelledError();
      trackTextLayer(container);
    })();

    return {
      promise,
      cancel() {
        cancelled = true;
        layer?.cancel();
        untrackTextLayer(container);
      },
    };
  }

  async outline(): Promise<OutlineItem[]> {
    const raw = (await this.#doc.getOutline()) as RawOutlineItem[] | null;
    return resolveOutline(
      raw,
      {
        getDestination: (name) => this.#doc.getDestination(name),
        getPageIndex: (ref) =>
          this.#doc.getPageIndex(ref as Parameters<PDFDocumentProxy['getPageIndex']>[0]),
      },
      this.pageCount,
    );
  }

  async destroy(): Promise<void> {
    if (this.#destroyed) return;
    this.#destroyed = true;
    // In PDF.js 6, destroying the loading task frees the document and its worker.
    await this.#doc.loadingTask.destroy();
  }
}

export const pdfjsEngine: PdfEngine = {
  async open(data) {
    const loadingTask = getDocument({ data });
    let doc: PDFDocumentProxy;
    try {
      doc = await loadingTask.promise;
    } catch (error) {
      await loadingTask.destroy();
      throw toOpenError(error);
    }
    try {
      return new PdfjsDoc(doc, await sizeOfPage(doc, 1));
    } catch (error) {
      await loadingTask.destroy();
      throw toOpenError(error);
    }
  },
};
