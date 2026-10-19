import { useEffect, useRef } from 'react';
import type { PdfDoc } from '../engine/types';
import { Viewer } from '../viewer/viewer';

/** Hosts the plain-TS Viewer. React owns only this element; the viewer owns everything inside. */
export function ReaderView({ doc }: { doc: PdfDoc }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const viewer = new Viewer(scroller, doc);
    // Focus the pages so arrow keys, Page Down and Space scroll the book right away.
    scroller.focus({ preventScroll: true });
    return () => viewer.destroy();
  }, [doc]);

  return (
    <div
      ref={scrollerRef}
      className="reader-scroller"
      data-testid="reader"
      tabIndex={0}
      role="region"
      aria-label="Book pages"
    />
  );
}
