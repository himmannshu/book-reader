import { useState } from 'react';
import type { BookRecord } from '../storage/types';

interface LibraryProps {
  books: BookRecord[];
  busy: boolean;
  onOpen(book: BookRecord): void;
  onRemove(book: BookRecord): void;
}

/** The books stored on this device. Removing asks for confirmation, because it deletes data. */
export function Library({ books, busy, onOpen, onRemove }: LibraryProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (books.length === 0) {
    return <p className="empty-state">No books yet. Open a PDF to start.</p>;
  }

  return (
    <section className="library" aria-labelledby="library-heading">
      <h2 id="library-heading">Your books</h2>
      <ul aria-label="Your books">
        {books.map((book) => (
          <li key={book.id} className="library-item">
            <button
              type="button"
              className="library-title"
              disabled={busy}
              onClick={() => onOpen(book)}
            >
              {book.title}
            </button>
            {confirmingId === book.id ? (
              <span className="library-confirm">
                Remove this book from this device?
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setConfirmingId(null);
                    onRemove(book);
                  }}
                >
                  Yes, remove
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
        ))}
      </ul>
    </section>
  );
}
