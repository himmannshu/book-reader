import { useEffect } from 'react';
import { pageLabel, type PageLabels } from '../core/page-labels';
import type { OutlineItem } from '../engine/types';
import { onTab, usePanelKeys } from './usePanelKeys';
import { EmptyState } from './controls';
import { Icon } from './icons';

export type OutlineState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; items: OutlineItem[] };

/** An entry's place in the outline, as its indexes from the top level down joined by dots. */
export const outlineKey = (path: readonly number[]) => path.join('.');

interface ContentsPanelProps {
  id: string;
  outline: OutlineState;
  /** Where the chapter being read sits in the outline (chapterPathAt), or null. */
  current: readonly number[] | null;
  /** Folded parents, by outlineKey; everything else is open. */
  collapsed: ReadonlySet<string>;
  onToggle(key: string): void;
  pageLabels: PageLabels;
  onChoose(pageIndex: number): void;
}

/**
 * The book's table of contents (phase 20, the design's TocList): nested lists whose parents fold
 * with a chevron button, titles that always jump, page numbers on the right, and the chapter being
 * read marked and scrolled into view. Focus moves to it (or the first entry) on open. Plain lists
 * and buttons, not tree roles: the arrow keys move between entries (usePanelKeys).
 */
export function ContentsPanel({
  id,
  outline,
  current,
  collapsed,
  onToggle,
  pageLabels,
  onChoose,
}: ContentsPanelProps) {
  const ready = outline.status === 'ready';
  const { ref, onKeyDown } = usePanelKeys<HTMLElement>(ready);
  const currentKey = current ? outlineKey(current) : null;

  useEffect(() => {
    if (!ready) return;
    const link = ref.current?.querySelector<HTMLButtonElement>(
      '.br-toc__link[aria-current="location"]',
    );
    if (!link) return;
    link.scrollIntoView({ block: 'nearest' });
    if (!onTab()) link.focus({ preventScroll: true });
  }, [ready, ref]);

  const render = (items: readonly OutlineItem[], parent: readonly number[]) => (
    <ul
      id={parent.length === 0 ? undefined : `${id}-${outlineKey(parent)}`}
      className="br-toc"
      aria-label={parent.length === 0 ? 'Contents' : undefined}
    >
      {items.map((item, index) => {
        const path = [...parent, index];
        const key = outlineKey(path);
        const parentOf = item.children.length > 0;
        const open = parentOf && !collapsed.has(key);
        const isCurrent = key === currentKey;
        return (
          <li key={key}>
            <div
              className={`br-toc__row${isCurrent ? ' is-current' : ''}`}
              style={{ ['--br-depth' as string]: parent.length }}
            >
              {parentOf ? (
                // The name says what a press does (as the bookmark toggle's does), so no
                // aria-expanded on top of it.
                <button
                  type="button"
                  className="br-toc__twisty"
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${item.title}`}
                  aria-controls={open ? `${id}-${key}` : undefined}
                  onClick={() => onToggle(key)}
                >
                  <Icon name={open ? 'expand' : 'forward'} size={16} />
                </button>
              ) : (
                <span className="br-toc__twisty" aria-hidden="true" />
              )}
              <button
                type="button"
                className="panel-entry br-toc__link"
                aria-current={isCurrent ? 'location' : undefined}
                disabled={item.pageIndex === null}
                title={item.pageIndex === null ? 'This entry does not point to a page' : undefined}
                onClick={() => {
                  if (item.pageIndex !== null) onChoose(item.pageIndex);
                }}
              >
                <span className="chapter br-toc__title">{item.title}</span>
                {item.pageIndex !== null && (
                  // A visual cue beside the title; the title alone names the entry.
                  <span className="br-toc__page" aria-hidden="true">
                    {pageLabel(item.pageIndex, pageLabels)}
                  </span>
                )}
              </button>
            </div>
            {open && render(item.children, path)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav id={id} ref={ref} aria-label="Table of contents" onKeyDown={onKeyDown}>
      {outline.status === 'loading' && <p className="panel-note">Loading contents…</p>}
      {outline.status === 'failed' && (
        <p className="panel-note">This book's table of contents couldn't be read.</p>
      )}
      {outline.status === 'ready' &&
        (outline.items.length === 0 ? (
          <EmptyState icon="contents" compact>
            This book has no table of contents.
          </EmptyState>
        ) : (
          render(outline.items, [])
        ))}
    </nav>
  );
}
