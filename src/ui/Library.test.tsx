import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BookRecord } from '../storage/types';
import { Library } from './Library';

const book = (id: string, hasFile: boolean): BookRecord => ({
  id,
  fileName: `${id}.pdf`,
  title: id,
  byteSize: 1,
  addedAt: 1,
  lastOpenedAt: 1,
  hasFile,
});

function setup(books: BookRecord[]) {
  const handlers = { onOpen: vi.fn(), onRemoveFromDevice: vi.fn(), onDeleteEverywhere: vi.fn() };
  render(<Library books={books} busy={false} {...handlers} />);
  return handlers;
}

const row = (title: string) =>
  screen.getAllByRole('listitem').find((li) => li.textContent?.includes(title)) as HTMLElement;

describe('Library', () => {
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
