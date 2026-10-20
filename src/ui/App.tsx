import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { markOpened, markOpenStart } from '../core/perf-marks';
import { pdfjsEngine } from '../engine/pdfjs-engine';
import { PdfOpenError, type PdfDoc, type PdfEngine } from '../engine/types';
import { createIndexedDBStores, indexedDBAvailable } from '../storage/indexeddb-book-store';
import {
  StorageError,
  type BookRecord,
  type BookStore,
  type BookmarkStore,
  type HighlightStore,
  type NoteStore,
} from '../storage/types';
import { downloadBook } from '../sync/downloader';
import { FileError } from '../sync/file-client';
import { httpFileClient, httpSyncClient } from '../sync/http-client';
import { withSyncTrigger } from '../sync/triggering';
import { Library } from './Library';
import { ReaderView, type ReaderHandle } from './ReaderView';
import { SyncStatusLine } from './SyncStatusLine';
import { UpdateNotice } from './UpdateNotice';
import { useSync, type SyncSetup } from './useSync';

interface OpenBook {
  /** New for every opened book, so the reader (and its panels) start fresh. */
  id: number;
  doc: PdfDoc;
  fileName: string;
  /** The stored book's id; null until a newly opened file is saved (and if saving fails). */
  bookId: string | null;
}

const defaultStores = createIndexedDBStores();
/** Sync needs IndexedDB; unit tests (jsdom) have none, so sync is off there unless passed in. */
const defaultSync: SyncSetup | null = indexedDBAvailable
  ? {
      store: defaultStores.sync,
      client: httpSyncClient(),
      files: { store: defaultStores.files, books: defaultStores.books, client: httpFileClient() },
    }
  : null;

/** What to tell the reader when a book from another device can't be downloaded. */
function downloadMessage(error: unknown): string {
  if (error instanceof FileError) {
    switch (error.kind) {
      case 'offline':
        return 'Connect to the internet to download this book.';
      case 'not-uploaded':
        return 'This book is still uploading from your other device. Try again in a little while.';
      case 'damaged':
        return 'The download was damaged. Try again.';
      case 'signed-out':
        return 'Sign in again to download this book: reload the page.';
      case 'deleted':
        return 'This book was deleted on another device.';
      case 'unavailable':
        return "Downloading books isn't set up here yet. Open its PDF on this device to read it.";
      default:
        break;
    }
  }
  return "This book couldn't be downloaded. Try again.";
}

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
  store = defaultStores.books,
  bookmarks = defaultStores.bookmarks,
  highlights = defaultStores.highlights,
  notes = defaultStores.notes,
  sync = defaultSync,
}: {
  engine?: PdfEngine;
  store?: BookStore;
  bookmarks?: BookmarkStore;
  highlights?: HighlightStore;
  notes?: NoteStore;
  sync?: SyncSetup | null;
}) {
  const reader = useRef<ReaderHandle>(null);
  const [book, setBook] = useState<OpenBook | null>(null);
  const nextBookId = useRef(0);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<{ bookId: string; percent: number } | null>(null);
  const download = useRef<AbortController | null>(null);
  /** Bumped when another device changed data, so the open reader reloads its annotations. */
  const [syncVersion, setSyncVersion] = useState(0);

  // Free the previous document's memory and worker when another book replaces it. Keyed on the
  // document, not the book: the book changes when a newly opened file gets its stored id.
  const doc = book?.doc;
  useEffect(() => {
    return () => {
      void doc?.destroy();
    };
  }, [doc]);

  const onRemoteChanges = useCallback(() => {
    setSyncVersion((version) => version + 1);
    store.list().then(setBooks, (err: unknown) => logUnexpected(err, 'Listing books failed'));
  }, [store]);
  const {
    status: syncStatus,
    uploads,
    engine: syncEngine,
    canDownload,
  } = useSync(sync, onRemoteChanges);
  // Every local write schedules a sync; the UI below only ever uses these wrapped stores.
  const user = useMemo(
    () =>
      withSyncTrigger({ books: store, bookmarks, highlights, notes }, () => syncEngine?.schedule()),
    [store, bookmarks, highlights, notes, syncEngine],
  );

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

  /** Opens bytes in the engine and shows the reader. Returns the opened book's id, or null. */
  async function show(
    load: () => Promise<Uint8Array>,
    fileName: string,
    bookId: string | null,
  ): Promise<number | null> {
    markOpenStart();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const doc = await engine.open(await load());
      markOpened();
      nextBookId.current += 1;
      const id = nextBookId.current;
      setBook({ id, doc, fileName, bookId });
      return id;
    } catch (err) {
      logUnexpected(err, 'Opening the PDF failed');
      setError(openMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function requestNavigation(proceed: () => void) {
    if (reader.current) reader.current.requestNavigation(proceed);
    else proceed();
  }

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // Allow choosing the same file again.
    if (!file) return;
    requestNavigation(() => {
      void openFile(file);
    });
  }

  async function openFile(file: File) {
    const opened = await show(
      async () => new Uint8Array(await file.arrayBuffer()),
      file.name,
      null,
    );
    if (opened === null) return; // Never keep a file that isn't a readable PDF.

    // Save in the background; reading never waits for it.
    try {
      const record = await user.books.add(file, file.name);
      // Bookmarks need the stored id. Skip it if another book was opened meanwhile.
      setBook((current) => (current?.id === opened ? { ...current, bookId: record.id } : current));
      setNotice('Saved on this device.');
      await refreshBooks();
    } catch (err) {
      logUnexpected(err, 'Saving the book failed');
      setError(storageMessage(err));
    }
  }

  /** A book from another device: download its file, keep it here, then open it (phase 09b). */
  async function downloadAndOpen(record: BookRecord) {
    const files = sync?.files;
    if (!files || download.current) return;
    const controller = new AbortController();
    download.current = controller;
    setError(null);
    setNotice(null);
    setDownloading({ bookId: record.id, percent: 0 });
    let bytes: Uint8Array;
    try {
      bytes = await downloadBook(record.id, files.client, {
        signal: controller.signal,
        onProgress: (received, total) =>
          setDownloading({ bookId: record.id, percent: Math.floor((received / total) * 100) }),
      });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        if (!(err instanceof FileError) || err.kind === 'failed') {
          console.error('Downloading the book failed', err);
        }
        setError(downloadMessage(err));
      }
      return;
    } finally {
      download.current = null;
      setDownloading(null);
    }
    let saveError: unknown = null;
    try {
      await user.books.putFile(record.id, bytes);
    } catch (err) {
      // Still readable now, just not kept (for example, storage is full).
      saveError = err;
      logUnexpected(err, 'Saving the downloaded book failed');
    }
    const opened = await show(async () => bytes, record.fileName, record.id);
    if (saveError !== null) setError(storageMessage(saveError));
    if (opened === null) return;
    try {
      await user.books.markOpened(record.id);
    } catch (err) {
      logUnexpected(err, 'Updating the library failed');
    }
    await refreshBooks();
  }

  async function onOpenFromLibrary(record: BookRecord) {
    if (record.hasFile === false) {
      await downloadAndOpen(record);
      return;
    }
    const opened = await show(() => user.books.getBytes(record.id), record.fileName, record.id);
    if (opened === null) return;
    try {
      await user.books.markOpened(record.id);
      await refreshBooks();
    } catch (err) {
      logUnexpected(err, 'Updating the library failed');
    }
  }

  async function onRemoveFromDevice(record: BookRecord) {
    setError(null);
    setNotice(null);
    try {
      await user.books.removeFromDevice(record.id);
      setNotice(
        `Removed the PDF of "${record.title}" from this device. Its notes and highlights are kept.`,
      );
    } catch (err) {
      logUnexpected(err, 'Removing the book failed');
      setError(storageMessage(err));
    }
    await refreshBooks();
  }

  async function onDeleteEverywhere(record: BookRecord) {
    setError(null);
    setNotice(null);
    try {
      await user.books.remove(record.id);
      setNotice(`Deleted "${record.title}" from all your devices.`);
    } catch (err) {
      logUnexpected(err, 'Deleting the book failed');
      setError(storageMessage(err));
    }
    await refreshBooks();
  }

  function backToLibrary() {
    requestNavigation(() => {
      setBook(null);
      setNotice(null);
      void refreshBooks();
    });
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
        <SyncStatusLine
          status={syncStatus}
          uploads={uploads}
          onSyncNow={() => void syncEngine?.syncNow()}
        />
      </header>
      <UpdateNotice />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {book ? (
        <ReaderView
          ref={reader}
          key={book.id}
          doc={book.doc}
          bookId={book.bookId}
          bookmarks={user.bookmarks}
          highlights={user.highlights}
          notes={user.notes}
          syncVersion={syncVersion}
        />
      ) : (
        <Library
          books={books}
          busy={busy}
          onOpen={(record) => void onOpenFromLibrary(record)}
          onRemoveFromDevice={(record) => void onRemoveFromDevice(record)}
          onDeleteEverywhere={(record) => void onDeleteEverywhere(record)}
          canDownload={canDownload}
          downloading={downloading}
          onCancelDownload={() => download.current?.abort()}
        />
      )}
    </div>
  );
}
