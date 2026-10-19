// The PDF engine interface. The rest of the app depends only on these types, never on PDF.js,
// so the engine can be swapped (see D2/D3 in harness/context/architecture-decisions.md).

/** A page's size in PDF points (1/72 inch), with the page's rotation applied. */
export interface PageSize {
  width: number;
  height: number;
}

export interface RenderTask {
  /** Resolves when the page is fully drawn. Rejects with RenderCancelledError if cancelled. */
  promise: Promise<void>;
  cancel(): void;
}

/** One entry of a book's table of contents. */
export interface OutlineItem {
  title: string;
  /** 0-based page the entry points to, or null when it has no usable destination. */
  pageIndex: number | null;
  children: OutlineItem[];
}

export interface PdfDoc {
  readonly pageCount: number;
  /** True once destroy() has been called. Errors from in-flight work after that can be ignored. */
  readonly destroyed: boolean;
  /** The first page's size, known as soon as the document opens. */
  readonly firstPageSize: PageSize;
  /** Loads the real size of every page. Cheap compared to rendering, but not free on long books. */
  loadPageSizes(): Promise<PageSize[]>;
  /**
   * Draws page `index` (0-based) into `canvas` at `scale` device pixels per PDF point.
   * Sets the canvas's pixel size; the caller controls its CSS size.
   */
  renderPage(index: number, canvas: HTMLCanvasElement, scale: number): RenderTask;
  /**
   * Fills `container` with page `index`'s selectable text, laid out at `scale` CSS pixels per PDF
   * point, over a page drawn at the same scale. The text is transparent; only selection shows.
   * Rejects with RenderCancelledError if cancelled. Pages without text leave it empty.
   */
  renderTextLayer(index: number, container: HTMLElement, scale: number): RenderTask;
  /** The book's table of contents; empty if it has none. Never rejects for a broken entry. */
  outline(): Promise<OutlineItem[]>;
  destroy(): Promise<void>;
}

export interface PdfEngine {
  /** Opens a PDF from its bytes. The bytes may be transferred to a worker and become unusable. */
  open(data: Uint8Array): Promise<PdfDoc>;
}

export type PdfOpenErrorKind = 'invalid' | 'password' | 'unknown';

export class PdfOpenError extends Error {
  readonly kind: PdfOpenErrorKind;

  constructor(kind: PdfOpenErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PdfOpenError';
    this.kind = kind;
  }
}

export class RenderCancelledError extends Error {
  constructor() {
    super('Page render was cancelled');
    this.name = 'RenderCancelledError';
  }
}
