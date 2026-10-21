import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReadingState } from '../core/reading-state';
import type { BookRecord } from '../storage/types';
import { Library } from './Library';

const book = (id: string, hasFile: boolean, byteSize = 1): BookRecord => ({
  id,
  fileName: `${id}.pdf`,
  title: id,
  byteSize,
  addedAt: 1,
  lastOpenedAt: 1,
  hasFile,
});

function setup(books: BookRecord[], extra: Partial<Parameters<typeof Library>[0]> = {}) {
  const handlers = {
    onOpen: vi.fn(),
    onRemoveFromDevice: vi.fn(),
    onDeleteEverywhere: vi.fn(),
    onCancelDownload: vi.fn(),
  };
  const view = render(<Library books={books} busy={false} {...handlers} {...extra} />);
  return { ...handlers, ...view };
}

const state = (bookId: string, pageIndex: number, pageCount: number): ReadingState => ({
  bookId,
  position: { pageIndex, fraction: 0, pixelsAbove: 0 },
  zoom: 'fit-width',
  savedAt: 1,
  pageCount,
});

/** Opens a book's More menu and chooses an item. */
function choose(title: string, item: string) {
  fireEvent.click(within(row(title)).getByRole('button', { name: `More for ${title}` }));
  fireEvent.click(screen.getByRole('menuitem', { name: item }));
}

const row = (title: string) =>
  screen.getAllByRole('listitem').find((li) => li.textContent?.includes(title)) as HTMLElement;

describe('Library', () => {
  it('where books can be downloaded, a book from another device opens from the list (phase 09b)', () => {
    const { onOpen } = setup([book('elsewhere', false, 12_400_000)], { canDownload: true });
    const item = row('elsewhere');
    expect(item).toHaveTextContent('On your other devices · 12.4 MB · downloads when you open it');
    fireEvent.click(within(item).getByRole('button', { name: 'elsewhere' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'elsewhere' }));
  });

  it('shows download progress with Cancel, and nothing else can be opened meanwhile', () => {
    const { onCancelDownload } = setup([book('elsewhere', false, 2_000_000), book('local', true)], {
      canDownload: true,
      downloading: { bookId: 'elsewhere', percent: 45 },
    });
    expect(row('elsewhere')).toHaveTextContent('Downloading… 45%');
    expect(within(row('local')).getByRole('button', { name: 'local' })).toBeDisabled();
    expect(
      within(row('elsewhere')).queryByRole('button', { name: 'More for elsewhere' }),
    ).toBeNull();
    fireEvent.click(within(row('elsewhere')).getByRole('button', { name: 'Cancel download' }));
    expect(onCancelDownload).toHaveBeenCalled();
  });

  it('lists a book from another device without opening it, and says how to read it', () => {
    const { onOpen } = setup([book('elsewhere', false)]);
    const item = row('elsewhere');
    expect(item).toHaveTextContent('On your other devices: open its PDF here to read it.');
    expect(within(item).queryByRole('button', { name: 'elsewhere' })).toBeNull();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('offers "Remove from this device" and "Delete everywhere" in More, each confirmed', () => {
    const { onRemoveFromDevice, onDeleteEverywhere } = setup([book('here', true)]);
    choose('here', 'Remove from this device');
    expect(onRemoveFromDevice).not.toHaveBeenCalled();
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Remove from this device' }));
    expect(onRemoveFromDevice).toHaveBeenCalledWith(expect.objectContaining({ id: 'here' }));

    choose('here', 'Delete everywhere');
    expect(onDeleteEverywhere).not.toHaveBeenCalled();
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Delete everywhere' }));
    expect(onDeleteEverywhere).toHaveBeenCalledWith(expect.objectContaining({ id: 'here' }));
  });

  it('a book that is only on other devices can only be deleted everywhere', () => {
    setup([book('elsewhere', false)]);
    fireEvent.click(within(row('elsewhere')).getByRole('button', { name: 'More for elsewhere' }));
    expect(screen.queryByRole('menuitem', { name: 'Remove from this device' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Delete everywhere' })).toBeVisible();
  });

  it('Cancel keeps the book', () => {
    const { onRemoveFromDevice, onDeleteEverywhere } = setup([book('here', true)]);
    choose('here', 'Delete everywhere');
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Cancel' }));
    expect(onRemoveFromDevice).not.toHaveBeenCalled();
    expect(onDeleteEverywhere).not.toHaveBeenCalled();
    expect(within(row('here')).queryByRole('button', { name: 'Delete everywhere' })).toBeNull();
  });

  it('shows one badge per book: New, Finished or In cloud, and progress while reading (phase 22)', () => {
    setup([book('fresh', true), book('half', true), book('done', true), book('far', false)], {
      states: new Map([
        ['half', state('half', 150, 300)],
        ['done', state('done', 299, 300)],
      ]),
    });
    expect(row('fresh')).toHaveTextContent('New');
    expect(
      within(row('half')).getByRole('progressbar', { name: 'Progress in half' }),
    ).toHaveAttribute('aria-valuenow', '50');
    expect(row('half')).not.toHaveTextContent('New');
    expect(row('done')).toHaveTextContent('Finished');
    expect(within(row('done')).queryByRole('progressbar')).toBeNull();
    expect(row('far')).toHaveTextContent('In cloud');
    for (const title of ['fresh', 'half', 'done', 'far'])
      expect(row(title).querySelectorAll('.br-badge').length).toBeLessThanOrEqual(1);
  });

  it('filters by chip with counts, together with the title filter (phase 22)', () => {
    setup([book('fresh', true), book('half', true), book('done', true), book('far', false)], {
      states: new Map([
        ['half', state('half', 150, 300)],
        ['done', state('done', 299, 300)],
      ]),
    });
    const chip = (name: RegExp) => screen.getByRole('button', { name });
    expect(chip(/^All/)).toHaveTextContent('All4');
    expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/^Reading/)).toHaveTextContent('Reading1');
    expect(chip(/^Unread/)).toHaveTextContent('Unread1');
    expect(chip(/^Finished/)).toHaveTextContent('Finished1');
    expect(chip(/^In cloud/)).toHaveTextContent('In cloud1');
    fireEvent.click(chip(/^Finished/));
    expect(
      screen.getAllByRole('listitem').map((li) => li.querySelector('h3')?.textContent),
    ).toEqual(['done']);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter books' }), {
      target: { value: 'half' },
    });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('No books match “half”.')).toBeInTheDocument();
  });

  it('offers In cloud only when some book is only in the cloud (phase 22)', () => {
    setup([book('here', true)]);
    expect(screen.queryByRole('button', { name: /^In cloud/ })).toBeNull();
  });

  it('switches between grid and list (phase 22)', () => {
    const onViewChange = vi.fn();
    const { rerender } = setup([book('here', true)], { onViewChange });
    expect(screen.getByRole('list', { name: 'Your books' })).toHaveClass('shelf--grid');
    fireEvent.click(screen.getByRole('radio', { name: 'List' }));
    expect(onViewChange).toHaveBeenCalledWith('list');
    rerender(
      <Library
        books={[book('here', true)]}
        busy={false}
        onOpen={vi.fn()}
        onRemoveFromDevice={vi.fn()}
        onDeleteEverywhere={vi.fn()}
        view="list"
      />,
    );
    expect(screen.getByRole('list', { name: 'Your books' })).toHaveClass('shelf--list');
    expect(row('here').classList).toContain('br-book--row');
  });

  it('shows the author when known (phase 22)', () => {
    setup([book('here', true)], { authors: new Map([['here', 'Mary Shelley']]) });
    expect(row('here')).toHaveTextContent('Mary Shelley');
  });
});
