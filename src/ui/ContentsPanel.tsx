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
 * The book's table of contents as a tree (phase 20, the design's TocList): parents fold with a
 * chevron, titles always jump, page numbers on the right, the chapter being read marked and
 * scrolled into view. Focus moves to it (or the first entry) on open.
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
      '[aria-current="location"] > .br-toc__row .br-toc__link',
    );
    if (!link) return;
    link.scrollIntoView({ block: 'nearest' });
    if (!onTab()) link.focus({ preventScroll: true });
  }, [ready, ref]);

  const render = (items: readonly OutlineItem[], parent: readonly number[]) => (
    <ul
      className="br-toc"
      role={parent.length === 0 ? 'tree' : 'group'}
      aria-label={parent.length === 0 ? 'Contents' : undefined}
    >
      {items.map((item, index) => {
        const path = [...parent, index];
        const key = outlineKey(path);
        const parentOf = item.children.length > 0;
        const open = parentOf && !collapsed.has(key);
        const isCurrent = key === currentKey;
        return (
          <li
            key={key}
            role="treeitem"
            aria-expanded={parentOf ? open : undefined}
            aria-current={isCurrent ? 'location' : undefined}
            aria-label={item.title}
          >
            <div
              className={`br-toc__row${isCurrent ? ' is-current' : ''}`}
              style={{ ['--br-depth' as string]: parent.length }}
            >
              {parentOf ? (
                <button
                  type="button"
                  className="br-toc__twisty"
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${item.title}`}
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
