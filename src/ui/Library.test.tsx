import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
    expect(within(row('elsewhere')).queryByRole('button', { name: 'Remove elsewhere' })).toBeNull();
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

  it('offers "Remove from this device" and "Delete everywhere" after Remove, each needing a click', () => {
    const { onRemoveFromDevice, onDeleteEverywhere } = setup([book('here', true)]);
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Remove here' }));
    expect(onRemoveFromDevice).not.toHaveBeenCalled();
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Remove from this device' }));
    expect(onRemoveFromDevice).toHaveBeenCalledWith(expect.objectContaining({ id: 'here' }));

    fireEvent.click(within(row('here')).getByRole('button', { name: 'Remove here' }));
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Delete everywhere' }));
    expect(onDeleteEverywhere).toHaveBeenCalledWith(expect.objectContaining({ id: 'here' }));
  });

  it('a book that is only on other devices can only be deleted everywhere', () => {
    setup([book('elsewhere', false)]);
    fireEvent.click(within(row('elsewhere')).getByRole('button', { name: 'Remove elsewhere' }));
    expect(
      within(row('elsewhere')).queryByRole('button', { name: 'Remove from this device' }),
    ).toBeNull();
    expect(
      within(row('elsewhere')).getByRole('button', { name: 'Delete everywhere' }),
    ).toBeVisible();
  });

  it('Cancel keeps the book', () => {
    const { onRemoveFromDevice, onDeleteEverywhere } = setup([book('here', true)]);
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Remove here' }));
    fireEvent.click(within(row('here')).getByRole('button', { name: 'Cancel' }));
    expect(onRemoveFromDevice).not.toHaveBeenCalled();
    expect(onDeleteEverywhere).not.toHaveBeenCalled();
    expect(within(row('here')).getByRole('button', { name: 'Remove here' })).toBeVisible();
  });
});
