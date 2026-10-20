import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../core/bookmarks';
import type { ReadingState } from '../core/reading-state';
import type { PdfDoc } from '../engine/types';
import {
  StorageError,
  type BookmarkStore,
  type HighlightStore,
  type ReadingStateStore,
} from '../storage/types';
import { ReaderView as Reader } from './ReaderView';

const noNotes = { list: async () => [], put: async () => {}, remove: async () => {} };
const noReadingStates: ReadingStateStore = {
  get: async () => null,
  put: async () => {},
  list: async () => [],
};
function ReaderView(
  props: Omit<ComponentProps<typeof Reader>, 'notes' | 'readingStates'> & {
    readingStates?: ReadingStateStore;
  },
) {
  return <Reader readingStates={noReadingStates} {...props} notes={noNotes} />;
}

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

const noHighlights: HighlightStore = {
  list: () => Promise.resolve([]),
  put: () => Promise.resolve(),
  remove: () => Promise.resolve(),
};

function fakeDoc() {
  const outline = vi.fn(() => Promise.resolve([]));
  const doc: PdfDoc = {
    pageCount: 2,
    destroyed: false,
    firstPageSize: { width: 612, height: 792 },
    loadPageSizes: () => new Promise(() => {}),
    renderPage: () => ({ promise: new Promise(() => {}), cancel: () => {} }),
    renderTextLayer: () => ({ promise: new Promise(() => {}), cancel: () => {} }),
    outline,
    destroy: () => Promise.resolve(),
  };
  return { doc, outline };
}

describe('ReaderView contents', () => {
  it('shows a visible loading reason and disables note creation until notes arrive', () => {
    const { doc } = fakeDoc();
    render(
      <Reader
        doc={doc}
        bookId="book"
        bookmarks={memoryBookmarks()}
        highlights={noHighlights}
        notes={{ ...noNotes, list: () => new Promise(() => {}) }}
        readingStates={noReadingStates}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByText('Loading notes…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add note to this page' })).toBeDisabled();
  });

  it('reads the outline only when Contents first opens, and only once per book', async () => {
    const { doc, outline } = fakeDoc();
    render(
      <ReaderView
        doc={doc}
        bookId={null}
        bookmarks={memoryBookmarks()}
        highlights={noHighlights}
      />,
    );
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
    render(
      <ReaderView
        doc={doc}
        bookId={null}
        bookmarks={memoryBookmarks()}
        highlights={noHighlights}
      />,
    );
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
    render(
      <ReaderView
        doc={doc}
        bookId="book"
        bookmarks={memoryBookmarks()}
        highlights={noHighlights}
      />,
    );
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
    render(
      <ReaderView
        doc={doc}
        bookId={null}
        bookmarks={memoryBookmarks()}
        highlights={noHighlights}
      />,
    );
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
    render(<ReaderView doc={doc} bookId="book" bookmarks={store} highlights={noHighlights} />);
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
    render(<ReaderView doc={doc} bookId="book" bookmarks={store} highlights={noHighlights} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks' }));
    expect(await screen.findByText("This book's bookmarks couldn't be read.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bookmark page' })).toBeDisabled();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe('ReaderView resuming a book opened with Open PDF', () => {
  const saved: ReadingState = {
    bookId: 'book',
    position: { pageIndex: 1, fraction: 0.5, pixelsAbove: 0 },
    zoom: 150,
    savedAt: 1,
  };

  /** A store whose saved state arrives only when the test says. */
  function lateStore() {
    let resolve!: (state: ReadingState | null) => void;
    const store: ReadingStateStore = {
      get: () => new Promise((r) => (resolve = r)),
      put: async () => {},
      list: async () => [],
    };
    return { store, arrive: (state: ReadingState | null) => resolve(state) };
  }

  function renderUnsaved(store: ReadingStateStore) {
    const { doc } = fakeDoc();
    const props = {
      doc,
      bookmarks: memoryBookmarks(),
      highlights: noHighlights,
      readingStates: store,
    };
    const view = render(<ReaderView {...props} bookId={null} />);
    return { rerenderSaved: () => view.rerender(<ReaderView {...props} bookId="book" />) };
  }

  it('goes to the saved place and zoom once the book is known', async () => {
    const { store, arrive } = lateStore();
    const { rerenderSaved } = renderUnsaved(store);
    rerenderSaved();
    await act(async () => arrive(saved));
    expect(screen.getByRole('combobox', { name: 'Zoom' })).toHaveValue('150');
  });

  it('stays put when the reader already scrolled', async () => {
    const { store, arrive } = lateStore();
    const { rerenderSaved } = renderUnsaved(store);
    fireEvent.scroll(screen.getByTestId('reader'));
    rerenderSaved();
    await act(async () => arrive(saved));
    expect(screen.getByRole('combobox', { name: 'Zoom' })).toHaveValue('fit-width');
  });
});

describe('ReaderView zoom menu', () => {
  it('shows a saved zoom that is not one of the set levels', () => {
    const { doc } = fakeDoc();
    render(
      <ReaderView
        doc={doc}
        bookId="book"
        bookmarks={memoryBookmarks()}
        highlights={noHighlights}
        initialState={{
          bookId: 'book',
          position: { pageIndex: 0, fraction: 0, pixelsAbove: 0 },
          zoom: 120,
          savedAt: 1,
        }}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Zoom' })).toHaveValue('120');
    expect(screen.getByRole('option', { name: '120%' })).toBeInTheDocument();
  });
});
