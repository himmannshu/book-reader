import { useEffect, useRef, useState } from 'react';
import type { PdfDoc } from '../engine/types';
import { Viewer } from '../viewer/viewer';
import { ContentsPanel, type OutlineState } from './ContentsPanel';

/** Below this width the contents panel covers the pages instead of sitting beside them. */
const NARROW_QUERY = '(max-width: 699px)';
const CONTENTS_ID = 'contents-panel';

/** Hosts the plain-TS Viewer. React owns only this element; the viewer owns everything inside. */
export function ReaderView({ doc }: { doc: PdfDoc }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  // Loaded once per book, the first time the panel opens, so it never delays the first page.
  const [loaded, setLoaded] = useState<{ doc: PdfDoc; outline: OutlineState } | null>(null);
  const outline: OutlineState = loaded?.doc === doc ? loaded.outline : { status: 'loading' };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const viewer = new Viewer(scroller, doc);
    viewerRef.current = viewer;
    // Focus the pages so arrow keys, Page Down and Space scroll the book right away.
    scroller.focus({ preventScroll: true });
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [doc]);

  function openContents() {
    setContentsOpen(true);
    if (loaded?.doc === doc) return;
    setLoaded({ doc, outline: { status: 'loading' } });
    doc.outline().then(
      (items) => setLoaded({ doc, outline: { status: 'ready', items } }),
      (error: unknown) => {
        if (doc.destroyed) return;
        console.error('Could not read the table of contents', error);
        setLoaded({ doc, outline: { status: 'failed' } });
      },
    );
  }

  function closeContents() {
    setContentsOpen(false);
    contentsButtonRef.current?.focus();
  }

  function choose(pageIndex: number) {
    viewerRef.current?.scrollToPage(pageIndex);
    if (window.matchMedia(NARROW_QUERY).matches) setContentsOpen(false);
    // Focus the pages, so Space and Page Down scroll the book instead of repeating the jump.
    scrollerRef.current?.focus({ preventScroll: true });
  }

  // While Contents is open, Escape closes it wherever focus is: in the panel, on the button, in the
  // pages, or on the page body (in Safari a mouse click does not focus the button it clicks).
  useEffect(() => {
    if (!contentsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setContentsOpen(false);
      contentsButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [contentsOpen]);

  return (
    <div className="reader">
      <div className="reader-tools">
        <button
          ref={contentsButtonRef}
          type="button"
          className="button secondary"
          aria-expanded={contentsOpen}
          aria-controls={contentsOpen ? CONTENTS_ID : undefined}
          onClick={() => (contentsOpen ? closeContents() : openContents())}
        >
          Contents
        </button>
      </div>
      <div className="reader-body">
        {contentsOpen && <ContentsPanel id={CONTENTS_ID} outline={outline} onChoose={choose} />}
        <div
          ref={scrollerRef}
          className="reader-scroller"
          data-testid="reader"
          tabIndex={0}
          role="region"
          aria-label="Book pages"
        />
      </div>
    </div>
  );
}
