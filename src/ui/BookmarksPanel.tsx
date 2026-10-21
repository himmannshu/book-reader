import { useEffect, useRef } from 'react';
import type { Bookmark } from '../core/bookmarks';
import { PANEL_ENTRY, usePanelKeys } from './usePanelKeys';
import { EmptyState } from './controls';
import { RowMenu } from './RowMenu';

export const UNSAVED_REASON = 'Bookmarks need this book saved on this device.';

export type BookmarksState =
  | { status: 'unsaved' }
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; items: Bookmark[] };

interface BookmarksPanelProps {
  id: string;
  bookmarks: BookmarksState;
  onChoose(pageIndex: number): void;
  /** Resolves to whether the bookmark was removed. */
  onRemove(bookmark: Bookmark): Promise<boolean>;
}

/** The book's bookmarks in page order, each with a jump and a More menu (Remove bookmark). */
export function BookmarksPanel({ id, bookmarks, onChoose, onRemove }: BookmarksPanelProps) {
  const { ref, onKeyDown } = usePanelKeys<HTMLElement>(bookmarks.status === 'ready');
  // After a removal, focus the entry that took its place, so the keyboard isn't left nowhere.
  const refocusAt = useRef<number | null>(null);
  const items = bookmarks.status === 'ready' ? bookmarks.items : null;

  useEffect(() => {
    const index = refocusAt.current;
    if (index === null || !items) return;
    refocusAt.current = null;
    const entries = ref.current?.querySelectorAll<HTMLButtonElement>(
      `.bookmark-jump${PANEL_ENTRY}`,
    );
    const next = entries?.[Math.min(index, entries.length - 1)];
    if (next) next.focus();
    else ref.current?.focus();
  }, [items, ref]);

  return (
    <nav id={id} ref={ref} aria-label="Bookmarks" tabIndex={-1} onKeyDown={onKeyDown}>
      {bookmarks.status === 'unsaved' && <p className="panel-note">{UNSAVED_REASON}</p>}
      {bookmarks.status === 'loading' && <p className="panel-note">Loading bookmarks…</p>}
      {bookmarks.status === 'failed' && (
        <p className="panel-note">This book's bookmarks couldn't be read.</p>
      )}
      {items &&
        (items.length === 0 ? (
          <EmptyState icon="bookmark" compact>
            No bookmarks yet.
          </EmptyState>
        ) : (
          <ul>
            {items.map((bookmark, index) => (
              <li key={bookmark.id} className="bookmark-row">
                <button
                  type="button"
                  className="panel-entry bookmark-jump"
                  onClick={() => onChoose(bookmark.pageIndex)}
                >
                  {bookmark.label}
                </button>
                <RowMenu
                  items={[
                    {
                      label: 'Remove bookmark',
                      icon: 'delete',
                      onSelect: () => {
                        refocusAt.current = index;
                        void onRemove(bookmark).then((removed) => {
                          if (!removed) refocusAt.current = null;
                        });
                      },
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        ))}
    </nav>
  );
}
