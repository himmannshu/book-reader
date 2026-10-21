import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import type { ReadingState } from '../core/reading-state';
import {
  SHELF_FILTERS,
  SHELF_SORTS,
  filterByStatus,
  filterShelf,
  shelfCounts,
  sortShelf,
  type ShelfFilter,
  type ShelfSort,
  type ShelfView,
} from '../core/shelf';
import type { BookRecord } from '../storage/types';
import { BookCard } from './BookCard';
import { Chip, EmptyState, SegmentedControl, cx } from './controls';
import { Icon } from './icons';

const SORT_OPTIONS = SHELF_SORTS.map((value) => ({
  value,
  label: { recent: 'Recent', title: 'Title', progress: 'Progress' }[value],
}));
const VIEW_OPTIONS = [
  { value: 'grid', label: 'Grid', icon: 'grid' },
  { value: 'list', label: 'List', icon: 'list' },
] as const;
const FILTER_LABELS: Record<ShelfFilter, string> = {
  all: 'All',
  reading: 'Reading',
  unread: 'Unread',
  finished: 'Finished',
  cloud: 'In cloud',
};
const NONE_IN_FILTER: Record<Exclude<ShelfFilter, 'all'>, string> = {
  reading: 'No books in progress. A book you have started appears here.',
  unread: 'Every book here has been started.',
  finished: 'No finished books yet. A book read to its last page appears here.',
  cloud: 'Every book is on this device.',
};
const NO_COVERS: ReadonlyMap<string, string> = new Map();
const NO_STATES: ReadonlyMap<string, ReadingState> = new Map();

interface LibraryProps {
  books: BookRecord[];
  busy: boolean;
  onOpen(book: BookRecord): void;
  /** Frees the file here; the book and its annotations stay in the cloud and on other devices. */
  onRemoveFromDevice(book: BookRecord): void;
  /** Deletes the book and its annotations on every device. */
  onDeleteEverywhere(book: BookRecord): void;
  /** Whether books from other devices can be downloaded here (phase 09b). */
  canDownload?: boolean;
  /** The book being downloaded, if any. */
  downloading?: { bookId: string; percent: number } | null;
  onCancelDownload?(): void;
  /** Cover image URLs by book id (phase 11). */
  covers?: ReadonlyMap<string, string>;
  /** Authors by book id, read with the covers (phase 22). */
  authors?: ReadonlyMap<string, string>;
  /** Saved reading states by book id, for progress. */
  states?: ReadonlyMap<string, ReadingState>;
  sort?: ShelfSort;
  onSortChange?(sort: ShelfSort): void;
  view?: ShelfView;
  onViewChange?(view: ShelfView): void;
}

/**
 * The library shelf (phase 22, the design's Library): a heading, filter chips with counts, sort and
 * grid/list controls, a title filter, and a BookCard per book. Books known from another device (no
 * file here) can be downloaded where that is set up.
 */
export function Library({
  books,
  busy,
  onOpen,
  onRemoveFromDevice,
  onDeleteEverywhere,
  canDownload = false,
  downloading = null,
  onCancelDownload,
  covers = NO_COVERS,
  authors = NO_COVERS,
  states = NO_STATES,
  sort = 'recent',
  onSortChange,
  view = 'grid',
  onViewChange,
}: LibraryProps) {
  const [chosen, setChosen] = useState<ShelfFilter>('all');
  const cancelDownload = useCallback(() => onCancelDownload?.(), [onCancelDownload]);
  const [filter, setFilter] = useState('');
  // Typing stays responsive with many books: the shelf may lag a frame behind the input.
  const deferredFilter = useDeferredValue(filter);
  const counts = useMemo(() => shelfCounts(books, states), [books, states]);
  // In cloud is offered only while some book is only in the cloud.
  const filters = SHELF_FILTERS.filter((option) => option !== 'cloud' || counts.cloud > 0);
  const status = filters.includes(chosen) ? chosen : 'all';
  const shown = useMemo(
    () =>
      filterShelf(filterByStatus(sortShelf(books, states, sort), states, status), deferredFilter),
    [books, states, sort, status, deferredFilter],
  );

  if (books.length === 0) {
    return (
      <EmptyState icon="library" title="Your library is empty">
        Books you open appear here, with your place, highlights and notes. Choose Open PDF to add
        one.
      </EmptyState>
    );
  }

  return (
    <section className="library" aria-labelledby="library-heading">
      <div className="library-header">
        <h2 id="library-heading" className="title-xl">
          Library
        </h2>
        <div className="library-chips" role="group" aria-label="Show">
          {filters.map((option) => (
            <Chip
              key={option}
              selected={status === option}
              count={counts[option]}
              onClick={() => setChosen(option)}
            >
              {FILTER_LABELS[option]}
            </Chip>
          ))}
        </div>
        <div className="library-controls">
          <div className="library-filter">
            <span className="library-filter__lead">
              <Icon name="search" size={18} />
            </span>
            <input
              type="search"
              aria-label="Filter books"
              placeholder="Filter by title"
              value={filter}
              onChange={(event) => setFilter(event.currentTarget.value)}
            />
          </div>
          <SegmentedControl
            label="Sort"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(next) => onSortChange?.(next)}
          />
          <SegmentedControl
            label="View"
            options={VIEW_OPTIONS}
            value={view}
            iconOnly
            onChange={(next) => onViewChange?.(next)}
          />
        </div>
      </div>
      {shown.length === 0 && (
        <EmptyState icon={filter.trim() ? 'search' : 'library'} compact>
          {filter.trim()
            ? `No books match “${filter.trim()}”.`
            : status === 'all'
              ? 'No books.'
              : NONE_IN_FILTER[status]}
        </EmptyState>
      )}
      <ul aria-label="Your books" className={cx('shelf', `shelf--${view}`)}>
        {shown.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            layout={view}
            coverUrl={covers.get(book.id)}
            author={authors.get(book.id)}
            state={states.get(book.id)}
            canDownload={canDownload}
            download={downloading?.bookId === book.id ? downloading : null}
            locked={downloading !== null}
            busy={busy}
            onOpen={onOpen}
            onCancelDownload={cancelDownload}
            onRemoveFromDevice={onRemoveFromDevice}
            onDeleteEverywhere={onDeleteEverywhere}
          />
        ))}
      </ul>
    </section>
  );
}
