// The page pill (phase 19), from the design's PagePill
// (harness/context/design-system/components/PagePill.md): "Page 142 of 380 · 37%", floating at the
// bottom of the reader while it scrolls or jumps, fading once the page settles.
import { pagePillText, type PageLabels } from '../core/page-labels';

export function PagePill({
  pageIndex,
  pageCount,
  labels,
  visible,
  settledPageIndex,
}: {
  pageIndex: number;
  pageCount: number;
  labels: PageLabels;
  visible: boolean;
  /** The page announced to screen readers: only once scrolling settles, not on every page. */
  settledPageIndex: number;
}) {
  const [place, progress] = pagePillText(pageIndex, pageCount, labels).split(' · ');
  return (
    <>
      <div
        className="br-pagepill"
        data-testid="page-pill"
        data-visible={visible}
        aria-hidden="true"
      >
        <span>{place}</span>
        <span className="br-pagepill__dot" />
        <span>{progress}</span>
      </div>
      {/* Polite, not role="status": the app's status messages keep that role to themselves. */}
      <span className="visually-hidden" aria-live="polite" data-testid="page-announcement">
        {pagePillText(settledPageIndex, pageCount, labels)}
      </span>
    </>
  );
}
