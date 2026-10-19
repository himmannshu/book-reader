import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { markOpened, markOpenStart } from '../core/perf-marks';
import { pdfjsEngine } from '../engine/pdfjs-engine';
import { PdfOpenError, type PdfDoc, type PdfEngine } from '../engine/types';
import { createIndexedDBBookStore } from '../storage/indexeddb-book-store';
import { StorageError, type BookRecord, type BookStore } from '../storage/types';
import { Library } from './Library';
import { ReaderView } from './ReaderView';

interface OpenBook {
  doc: PdfDoc;
  fileName: string;
}

const defaultStore = createIndexedDBBookStore();

function openMessage(error: unknown): string {
  if (error instanceof StorageError) return storageMessage(error);
  if (error instanceof PdfOpenError) {
    switch (error.kind) {
      case 'invalid':
        return "This file isn't a readable PDF.";
      case 'password':
        return "This PDF is password-protected. Password-protected PDFs aren't supported yet.";
      case 'unknown':
        break;
    }
  }
  return "This PDF couldn't be opened.";
}

function storageMessage(error: unknown): string {
  const kind = error instanceof StorageError ? error.kind : 'unknown';
  switch (kind) {
    case 'quota':
      return "There isn't enough storage space to keep this book on this device. You can still read it now.";
    case 'unavailable':
      return "This browser mode can't save books, so this one won't be kept after you close it. You can still read it now.";
    case 'not-found':
      return 'That book is no longer stored on this device.';
    case 'unknown':
      return "This book couldn't be saved on this device. You can still read it now.";
  }
}

function logUnexpected(error: unknown, what: string) {
  const expected =
    (error instanceof PdfOpenError && error.kind !== 'unknown') ||
    (error instanceof StorageError && error.kind !== 'unknown');
  if (!expected) console.error(what, error);
}

export function App({
  engine = pdfjsEngine,
  store = defaultStore,
}: {
  engine?: PdfEngine;
  store?: BookStore;
}) {
  const [book, setBook] = useState<OpenBook | null>(null);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Free the previous document's memory and worker when another book replaces it.
  useEffect(() => {
    const doc = book?.doc;
    return () => {
      void doc?.destroy();
    };
  }, [book]);

  const refreshBooks = useCallback(async () => {
    try {
      setBooks(await store.list());
    } catch (err) {
      logUnexpected(err, 'Listing books failed');
      setError(storageMessage(err));
    }
  }, [store]);

  // Load the library once on start (and if the store changes).
  useEffect(() => {
    let cancelled = false;
    store.list().then(
      (list) => {
        if (!cancelled) setBooks(list);
      },
      (err: unknown) => {
        if (cancelled) return;
        logUnexpected(err, 'Listing books failed');
        setError(storageMessage(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store]);

  /** Opens bytes in the engine and shows the reader. Returns false if opening failed. */
  async function show(load: () => Promise<Uint8Array>, fileName: string): Promise<boolean> {
    markOpenStart();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const doc = await engine.open(await load());
      markOpened();
      setBook({ doc, fileName });
      return true;
    } catch (err) {
      logUnexpected(err, 'Opening the PDF failed');
      setError(openMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // Allow choosing the same file again.
    if (!file) return;

    const opened = await show(async () => new Uint8Array(await file.arrayBuffer()), file.name);
    if (!opened) return; // Never keep a file that isn't a readable PDF.

    // Save in the background; reading never waits for it.
    try {
      await store.add(file, file.name);
      setNotice('Saved on this device.');
      await refreshBooks();
    } catch (err) {
      logUnexpected(err, 'Saving the book failed');
      setError(storageMessage(err));
    }
  }

  async function onOpenFromLibrary(record: BookRecord) {
    const opened = await show(() => store.getBytes(record.id), record.fileName);
    if (!opened) return;
    try {
      await store.markOpened(record.id);
      await refreshBooks();
    } catch (err) {
      logUnexpected(err, 'Updating the library failed');
    }
  }

  async function onRemove(record: BookRecord) {
    setError(null);
    setNotice(null);
    try {
      await store.remove(record.id);
      setNotice(`Removed "${record.title}" from this device.`);
    } catch (err) {
      logUnexpected(err, 'Removing the book failed');
      setError(storageMessage(err));
    }
    await refreshBooks();
  }

  function backToLibrary() {
    setBook(null);
    setNotice(null);
    void refreshBooks();
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Book Reader</h1>
        {book && (
          <button type="button" className="button secondary" onClick={backToLibrary}>
            Library
          </button>
        )}
        <label className="button">
          Open PDF
          <input
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => void onFileChosen(event)}
            disabled={busy}
          />
        </label>
        {book && (
          <p className="book-info" data-testid="book-info">
            {book.fileName} · {book.doc.pageCount} {book.doc.pageCount === 1 ? 'page' : 'pages'}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {book ? (
        <ReaderView doc={book.doc} />
      ) : (
        <Library
          books={books}
          busy={busy}
          onOpen={(record) => void onOpenFromLibrary(record)}
          onRemove={(record) => void onRemove(record)}
        />
      )}
    </div>
  );
}
