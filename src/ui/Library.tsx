import { useDeferredValue, useMemo, useState } from 'react';
import { formatSize } from '../core/library';
import type { ReadingState } from '../core/reading-state';
import {
  SHELF_SORTS,
  filterShelf,
  readingProgress,
  sortShelf,
  validShelfSort,
  type ShelfSort,
} from '../core/shelf';
import type { BookRecord } from '../storage/types';

const SORT_LABELS: Record<ShelfSort, string> = {
  recent: 'Recent',
  title: 'Title',
  progress: 'Progress',
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
  /** Saved reading states by book id, for progress. */
  states?: ReadonlyMap<string, ReadingState>;
  sort?: ShelfSort;
  onSortChange?(sort: ShelfSort): void;
}

/**
 * The library shelf: a cover, the title and the reading progress for each book, with sort and a
 * filter. Books known from another device (no file here) can be downloaded where that is set up.
 * Removing asks first, because it deletes data.
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
  states = NO_STATES,
  sort = 'recent',
  onSortChange,
}: LibraryProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  // Typing stays responsive with many books: the shelf may lag a frame behind the input.
  const deferredFilter = useDeferredValue(filter);
  const shown = useMemo(
    () => filterShelf(sortShelf(books, states, sort), deferredFilter),
    [books, states, sort, deferredFilter],
  );

  if (books.length === 0) {
    return <p className="empty-state">No books yet. Open a PDF to start.</p>;
  }

  return (
    <section className="library" aria-labelledby="library-heading">
      <div className="library-header">
        <h2 id="library-heading">Your books</h2>
        <input
          type="search"
          className="picker library-filter"
          aria-label="Filter books"
          placeholder="Filter"
          value={filter}
          onChange={(event) => setFilter(event.currentTarget.value)}
        />
        <label className="theme-picker">
          Sort
          <select
            className="picker"
            value={sort}
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (validShelfSort(next)) onSortChange?.(next);
            }}
          >
            {SHELF_SORTS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {shown.length === 0 && <p className="panel-note">No books match “{filter.trim()}”.</p>}
      <ul aria-label="Your books" className="shelf">
        {shown.map((book) => {
          const here = book.hasFile !== false;
          const openable = here || canDownload;
          const progress = downloading?.bookId === book.id ? downloading : null;
          const coverUrl = covers.get(book.id);
          const read = readingProgress(states.get(book.id));
          const cover = coverUrl ? (
            <img className="cover" src={coverUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="cover cover-placeholder" aria-hidden="true">
              {book.title}
            </span>
          );
          const readLine = (
            <span className="library-progress">
              {read ? (
                <>
                  <span
                    className="progress-bar"
                    role="progressbar"
                    aria-label={`Progress in ${book.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={read.percent}
                  >
                    <span style={{ width: `${read.percent}%` }} />
                  </span>
                  {`Page ${read.page} of ${read.pageCount} · ${read.percent}%`}
                </>
              ) : (
                'Not started'
              )}
            </span>
          );
          return (
            <li key={book.id} className={here ? 'library-item' : 'library-item elsewhere'}>
              {openable ? (
                <span className="library-title-group">
                  <button
                    type="button"
                    className="library-open"
                    disabled={busy || downloading !== null}
                    onClick={() => onOpen(book)}
                  >
                    {cover}
                    <span className="library-title">{book.title}</span>
                  </button>
                  {readLine}
                  {!here && (
                    <span className="library-note" aria-live="polite">
                      {progress
                        ? `Downloading… ${progress.percent}%`
                        : `On your other devices · ${formatSize(book.byteSize)} · downloads when you open it`}
                    </span>
                  )}
                </span>
              ) : (
                <span className="library-title-group">
                  {cover}
                  <span className="library-title">{book.title}</span>
                  <span className="library-note">
                    On your other devices: open its PDF here to read it.
                  </span>
                </span>
              )}
              {progress ? (
                <button type="button" onClick={() => onCancelDownload?.()}>
                  Cancel download
                </button>
              ) : confirmingId === book.id ? (
                <span className="library-confirm">
                  Remove this book?
                  {here && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingId(null);
                        onRemoveFromDevice(book);
                      }}
                    >
                      Remove from this device
                    </button>
                  )}
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setConfirmingId(null);
                      onDeleteEverywhere(book);
                    }}
                  >
                    Delete everywhere
                  </button>
                  <button type="button" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove ${book.title}`}
                  disabled={busy}
                  onClick={() => setConfirmingId(book.id)}
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
