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
    pageLabels: () => Promise.resolve(null),
    author: () => Promise.resolve(null),
    pageText: () => Promise.resolve(''),
    destroy: () => Promise.resolve(),
  };
  return { doc, outline };
}

/** Opens the tabbed panel with Contents and shows a tab (phase 20). */
function showTab(name: 'Bookmarks' | 'Notes') {
  if (!screen.queryByRole('tablist', { name: 'Reader panels' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Contents' }));
  }
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));
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
    showTab('Notes');
    expect(screen.getByText('Loading notes…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add note to this page' })).toBeDisabled();
  });

  it('reads the outline once per book, and not before the first page is drawn unless Contents opens', async () => {
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
    const toggle = screen.getByRole('button', { name: 'Bookmark this page' });
    await vi.waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toHaveClass('is-pressed');

    fireEvent.click(toggle);
    // Phase 19: the design's toggle says what a press does, and shows pressed.
    expect(await screen.findByRole('button', { name: 'Remove bookmark' })).toHaveClass(
      'is-pressed',
    );
    showTab('Bookmarks');
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
  });

  it('marks the toggle disabled and says why, also on a tap, when the book is not saved here', () => {
    const { doc } = fakeDoc();
    render(
      <ReaderView
        doc={doc}
        bookId={null}
        bookmarks={memoryBookmarks()}
        highlights={noHighlights}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Bookmark this page' });
    // Phase 14: aria-disabled rather than disabled, so a tap can say why (iOS has no tooltips).
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    expect(toggle).toHaveAttribute('title', 'Bookmarks need this book saved on this device.');
    fireEvent.click(toggle);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bookmarks need this book saved on this device.',
    );
    showTab('Bookmarks');
    // In the panel too (and still in the alert).
    expect(screen.getAllByText('Bookmarks need this book saved on this device.')).toHaveLength(2);
  });

  it('shows a readable message when a bookmark cannot be saved', async () => {
    const { doc } = fakeDoc();
    const store = {
      ...memoryBookmarks(),
      put: () => Promise.reject(new StorageError('quota', 'full')),
    };
    render(<ReaderView doc={doc} bookId="book" bookmarks={store} highlights={noHighlights} />);
    const toggle = screen.getByRole('button', { name: 'Bookmark this page' });
    await vi.waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "There isn't enough storage space to save this bookmark.",
    );
    expect(screen.getByRole('button', { name: 'Bookmark this page' })).not.toHaveClass(
      'is-pressed',
    );
  });

  it('says so when the bookmarks cannot be read', async () => {
    const { doc } = fakeDoc();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = { ...memoryBookmarks(), list: () => Promise.reject(new Error('broken')) };
    render(<ReaderView doc={doc} bookId="book" bookmarks={store} highlights={noHighlights} />);
    showTab('Bookmarks');
    expect(await screen.findByText("This book's bookmarks couldn't be read.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bookmark this page' })).toBeDisabled();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

/** Opens Reading settings and reads the chosen Fit and the zoom shown (phase 19). */
function fitAndZoom(): [string, string] {
  if (!screen.queryByRole('dialog', { name: 'Reading settings' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Reading settings' }));
  }
  const fit = screen.getByRole('radiogroup', { name: 'Fit' });
  const chosen = fit.querySelector('[aria-checked="true"]')?.textContent?.trim() ?? '';
  return [chosen, screen.getByTestId('zoom-value').textContent ?? ''];
}

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
    expect(fitAndZoom()).toEqual(['Custom', '150%']);
  });

  it('stays put when the reader already scrolled', async () => {
    const { store, arrive } = lateStore();
    const { rerenderSaved } = renderUnsaved(store);
    fireEvent.scroll(screen.getByTestId('reader'));
    rerenderSaved();
    await act(async () => arrive(saved));
    expect(fitAndZoom()[0]).toBe('Width');
  });
});

describe('ReaderView zoom in Reading settings', () => {
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
    expect(fitAndZoom()).toEqual(['Custom', '120%']);
  });
});
