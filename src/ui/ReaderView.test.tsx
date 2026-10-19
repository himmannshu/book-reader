import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../core/bookmarks';
import type { PdfDoc } from '../engine/types';
import { StorageError, type BookmarkStore } from '../storage/types';
import { ReaderView } from './ReaderView';

function memoryBookmarks(initial: Bookmark[] = []): BookmarkStore {
  let marks = [...initial];
  return {
    list: (bookId) => Promise.resolve(marks.filter((m) => m.bookId === bookId)),
    put: (mark) => {
      marks = [...marks.filter((m) => m.id !== mark.id), mark];
      return Promise.resolve();
    },
    remove: (id) => {
      marks = marks.filter((m) => m.id !== id);
      return Promise.resolve();
    },
  };
}

function fakeDoc() {
  const outline = vi.fn(() => Promise.resolve([]));
  const doc: PdfDoc = {
    pageCount: 2,
    destroyed: false,
    firstPageSize: { width: 612, height: 792 },
    loadPageSizes: () => new Promise(() => {}),
    renderPage: () => ({ promise: new Promise(() => {}), cancel: () => {} }),
    outline,
    destroy: () => Promise.resolve(),
  };
  return { doc, outline };
}

describe('ReaderView contents', () => {
  it('reads the outline only when Contents first opens, and only once per book', async () => {
    const { doc, outline } = fakeDoc();
    render(<ReaderView doc={doc} bookId={null} bookmarks={memoryBookmarks()} />);
    expect(outline).not.toHaveBeenCalled();

    const button = screen.getByRole('button', { name: 'Contents' });
    fireEvent.click(button);
    expect(await screen.findByText('This book has no table of contents.')).toBeInTheDocument();
    expect(outline).toHaveBeenCalledTimes(1);

    fireEvent.click(button); // close
    fireEvent.click(button); // open again
    expect(await screen.findByText('This book has no table of contents.')).toBeInTheDocument();
    expect(outline).toHaveBeenCalledTimes(1);
  });
});

describe('ReaderView contents errors', () => {
  it('says so when the table of contents cannot be read', async () => {
    const { doc, outline } = fakeDoc();
    outline.mockImplementation(() => Promise.reject(new Error('broken outline')));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ReaderView doc={doc} bookId={null} bookmarks={memoryBookmarks()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Contents' }));
    expect(
      await screen.findByText("This book's table of contents couldn't be read."),
    ).toBeInTheDocument();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe('ReaderView bookmarks', () => {
  it('marks the current page and lists it with its page number', async () => {
    const { doc } = fakeDoc();
    render(<ReaderView doc={doc} bookId="book" bookmarks={memoryBookmarks()} />);
    const toggle = screen.getByRole('button', { name: 'Bookmark page' });
    await vi.waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks' }));
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
  });

  it('disables the toggle and says why when the book is not saved on this device', () => {
    const { doc } = fakeDoc();
    render(<ReaderView doc={doc} bookId={null} bookmarks={memoryBookmarks()} />);
    const toggle = screen.getByRole('button', { name: 'Bookmark page' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('title', 'Bookmarks need this book saved on this device.');
    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks' }));
    expect(screen.getByText('Bookmarks need this book saved on this device.')).toBeInTheDocument();
  });

  it('shows a readable message when a bookmark cannot be saved', async () => {
    const { doc } = fakeDoc();
    const store = {
      ...memoryBookmarks(),
      put: () => Promise.reject(new StorageError('quota', 'full')),
    };
    render(<ReaderView doc={doc} bookId="book" bookmarks={store} />);
    const toggle = screen.getByRole('button', { name: 'Bookmark page' });
    await vi.waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "There isn't enough storage space to save this bookmark.",
    );
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('says so when the bookmarks cannot be read', async () => {
    const { doc } = fakeDoc();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = { ...memoryBookmarks(), list: () => Promise.reject(new Error('broken')) };
    render(<ReaderView doc={doc} bookId="book" bookmarks={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks' }));
    expect(await screen.findByText("This book's bookmarks couldn't be read.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bookmark page' })).toBeDisabled();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
