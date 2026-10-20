import type { OutlineItem } from '../engine/types';
import { usePanelKeys } from './usePanelKeys';
import { EmptyState } from './controls';

export type OutlineState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; items: OutlineItem[] };

interface ContentsPanelProps {
  id: string;
  outline: OutlineState;
  onChoose(pageIndex: number): void;
}

function OutlineList({
  items,
  onChoose,
}: {
  items: OutlineItem[];
  onChoose(pageIndex: number): void;
}) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          <button
            type="button"
            className="panel-entry"
            disabled={item.pageIndex === null}
            title={item.pageIndex === null ? 'This entry does not point to a page' : undefined}
            onClick={() => {
              if (item.pageIndex !== null) onChoose(item.pageIndex);
            }}
          >
            {item.title}
          </button>
          {item.children.length > 0 && <OutlineList items={item.children} onChoose={onChoose} />}
        </li>
      ))}
    </ul>
  );
}

/** The book's table of contents. Focus moves to the first entry on open. */
export function ContentsPanel({ id, outline, onChoose }: ContentsPanelProps) {
  const { ref, onKeyDown } = usePanelKeys<HTMLElement>(outline.status === 'ready');

  return (
    <nav
      id={id}
      ref={ref}
      className="side-panel"
      aria-label="Table of contents"
      onKeyDown={onKeyDown}
    >
      <h2>Contents</h2>
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
          <OutlineList items={outline.items} onChoose={onChoose} />
        ))}
    </nav>
  );
}
