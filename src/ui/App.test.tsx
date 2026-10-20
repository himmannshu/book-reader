import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PdfOpenError, type PdfDoc, type PdfEngine } from '../engine/types';
import { StorageError, type BookRecord, type BookStore } from '../storage/types';
import { App } from './App';

function failingEngine(error: Error): PdfEngine {
  return { open: () => Promise.reject(error) };
}

/** An engine whose documents never draw: enough for testing the app shell. */
const fakeDoc: PdfDoc = {
  pageCount: 2,
  destroyed: false,
  firstPageSize: { width: 612, height: 792 },
  loadPageSizes: () => new Promise(() => {}),
  renderPage: () => ({ promise: new Promise(() => {}), cancel: () => {} }),
  renderTextLayer: () => ({ promise: new Promise(() => {}), cancel: () => {} }),
  outline: () => Promise.resolve([]),
  destroy: () => Promise.resolve(),
};
const workingEngine: PdfEngine = { open: () => Promise.resolve(fakeDoc) };

function memoryStore(books: BookRecord[] = []): BookStore {
  return {
    add: () => Promise.reject(new Error('not used')),
    list: () => Promise.resolve(books),
    getBytes: () => Promise.resolve(new TextEncoder().encode('%PDF')),
    markOpened: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    removeFromDevice: () => Promise.resolve(),
    putFile: () => Promise.resolve(),
  };
}

function storeFailingToSave(kind: StorageError['kind']): BookStore {
  return { ...memoryStore(), add: () => Promise.reject(new StorageError(kind, 'nope')) };
}

function chooseFile(name: string) {
  const input = screen.getByLabelText('Open PDF');
  fireEvent.change(input, { target: { files: [new File(['%PDF'], name)] } });
}

describe('App', () => {
  it('shows the app name as the page heading', () => {
    render(<App store={memoryStore()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Book Reader' })).toBeInTheDocument();
  });

  it('invites the reader to open a PDF when no books are stored', async () => {
    render(<App store={memoryStore()} />);
    expect(await screen.findByText('No books yet. Open a PDF to start.')).toBeInTheDocument();
  });

  it('lists the stored books', async () => {
    const book: BookRecord = {
      id: 'x',
      fileName: 'x.pdf',
      title: 'A Stored Book',
      byteSize: 4,
      addedAt: 1,
      lastOpenedAt: 1,
    };
    render(<App store={memoryStore([book])} />);
    const list = await screen.findByRole('list', { name: 'Your books' });
    expect(list).toHaveTextContent('A Stored Book');
  });

  it('explains when the chosen file is not a PDF', async () => {
    render(
      <App engine={failingEngine(new PdfOpenError('invalid', 'bad'))} store={memoryStore()} />,
    );
    chooseFile('notes.txt');
    expect(await screen.findByRole('alert')).toHaveTextContent("This file isn't a readable PDF.");
  });

  it('explains when the PDF is password-protected', async () => {
    render(
      <App engine={failingEngine(new PdfOpenError('password', 'locked'))} store={memoryStore()} />,
    );
    chooseFile('locked.pdf');
    expect(await screen.findByRole('alert')).toHaveTextContent('password-protected');
  });

  it('explains a full disk, and keeps the book open for reading', async () => {
    render(<App engine={workingEngine} store={storeFailingToSave('quota')} />);
    chooseFile('big.pdf');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "There isn't enough storage space to keep this book on this device. You can still read it now.",
    );
    expect(screen.getByTestId('book-info')).toHaveTextContent('big.pdf · 2 pages');
  });

  it('explains when this browser mode cannot save books, and keeps the book open', async () => {
    render(<App engine={workingEngine} store={storeFailingToSave('unavailable')} />);
    chooseFile('private.pdf');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This browser mode can't save books",
    );
    expect(screen.getByTestId('book-info')).toHaveTextContent('private.pdf');
  });

  it('keeps the open book after it is saved, and enables bookmarks for it', async () => {
    const destroy = vi.fn(() => Promise.resolve());
    const doc: PdfDoc = { ...fakeDoc, destroy };
    const record: BookRecord = {
      id: 'saved',
      fileName: 'new.pdf',
      title: 'new',
      byteSize: 4,
      addedAt: 1,
      lastOpenedAt: 1,
    };
    // The save finishes only after the reader is showing, as it does in a browser.
    let finishSave!: () => void;
    const saved = new Promise<void>((resolve) => (finishSave = resolve));
    const store: BookStore = { ...memoryStore(), add: () => saved.then(() => record) };
    const bookmarks = {
      list: vi.fn(() => Promise.resolve([])),
      put: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    };
    render(
      <App engine={{ open: () => Promise.resolve(doc) }} store={store} bookmarks={bookmarks} />,
    );
    chooseFile('new.pdf');
    expect(await screen.findByTestId('book-info')).toHaveTextContent('new.pdf');
    finishSave();
    expect(await screen.findByRole('status')).toHaveTextContent('Saved on this device.');
    await vi.waitFor(() => expect(bookmarks.list).toHaveBeenCalledWith('saved'));
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bookmark page' })).toBeEnabled(),
    );
    expect(destroy).not.toHaveBeenCalled();
  });
});
