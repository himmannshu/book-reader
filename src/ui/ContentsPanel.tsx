import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { OutlineItem } from '../engine/types';

export type OutlineState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; items: OutlineItem[] };

interface ContentsPanelProps {
  id: string;
  outline: OutlineState;
  onChoose(pageIndex: number): void;
  onClose(): void;
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
            className="contents-entry"
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

/** The book's table of contents. Escape closes it; focus moves to the first entry on open. */
export function ContentsPanel({ id, outline, onChoose, onClose }: ContentsPanelProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (outline.status !== 'ready') return;
    panelRef.current?.querySelector<HTMLButtonElement>('.contents-entry:not(:disabled)')?.focus();
  }, [outline.status]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <nav
      id={id}
      ref={panelRef}
      className="contents-panel"
      aria-label="Table of contents"
      onKeyDown={onKeyDown}
    >
      <h2>Contents</h2>
      {outline.status === 'loading' && <p className="contents-note">Loading contents…</p>}
      {outline.status === 'failed' && (
        <p className="contents-note">This book's table of contents couldn't be read.</p>
      )}
      {outline.status === 'ready' &&
        (outline.items.length === 0 ? (
          <p className="contents-note">This book has no table of contents.</p>
        ) : (
          <OutlineList items={outline.items} onChoose={onChoose} />
        ))}
    </nav>
  );
}
