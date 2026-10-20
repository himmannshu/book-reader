import { useState } from 'react';
import { formatSize } from '../core/library';
import type { BookRecord } from '../storage/types';

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
}

/**
 * The library. Books known from another device (no file here) are listed but can't be opened
 * until their PDF is opened here. Removing asks first, because it deletes data.
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
}: LibraryProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (books.length === 0) {
    return <p className="empty-state">No books yet. Open a PDF to start.</p>;
  }

  return (
    <section className="library" aria-labelledby="library-heading">
      <h2 id="library-heading">Your books</h2>
      <ul aria-label="Your books">
        {books.map((book) => {
          const here = book.hasFile !== false;
          const openable = here || canDownload;
          const progress = downloading?.bookId === book.id ? downloading : null;
          return (
            <li key={book.id} className={here ? 'library-item' : 'library-item elsewhere'}>
              {openable ? (
                <span className="library-title-group">
                  <button
                    type="button"
                    className="library-title"
                    disabled={busy || downloading !== null}
                    onClick={() => onOpen(book)}
                  >
                    {book.title}
                  </button>
                  {!here && (
                    <span className="library-note" aria-live="polite">
                      {progress
                        ? `Downloading… ${progress.percent}%`
                        : `On your other devices · ${formatSize(book.byteSize)} · downloads when you open it`}
                    </span>
                  )}
                </span>
              ) : (
                <span className="library-title">
                  {book.title}
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
