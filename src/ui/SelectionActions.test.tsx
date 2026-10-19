import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionActions } from './SelectionActions';

describe('SelectionActions', () => {
  it('offers Highlight for a selection, without dropping the selection on press', () => {
    const onHighlight = vi.fn();
    render(
      <SelectionActions
        action={{ kind: 'create', left: 10, top: 20 }}
        unsavedReason={null}
        onHighlight={onHighlight}
        onRemove={() => {}}
      />,
    );
    const button = screen.getByRole('button', { name: 'Highlight' });
    const pointerDown = createEvent.pointerDown(button);
    fireEvent(button, pointerDown);
    expect(pointerDown.defaultPrevented).toBe(true);
    const mouseDown = createEvent.mouseDown(button);
    fireEvent(button, mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);

    fireEvent.click(button);
    expect(onHighlight).toHaveBeenCalledTimes(1);
  });

  it('shows why Highlight is unavailable for a book that is not saved', () => {
    render(
      <SelectionActions
        action={{ kind: 'create', left: 10, top: 20 }}
        unsavedReason="Highlights need this book saved on this device."
        onHighlight={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Highlight' })).toBeDisabled();
    expect(screen.getByText('Highlights need this book saved on this device.')).toBeVisible();
  });

  it('offers Remove highlight for a chosen highlight', () => {
    const onRemove = vi.fn();
    render(
      <SelectionActions
        action={{ kind: 'remove', id: 'h1', left: 10, top: 20 }}
        unsavedReason={null}
        onHighlight={() => {}}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove highlight' }));
    expect(onRemove).toHaveBeenCalledWith('h1');
  });

  it('renders nothing without an action', () => {
    const { container } = render(
      <SelectionActions
        action={null}
        unsavedReason={null}
        onHighlight={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
