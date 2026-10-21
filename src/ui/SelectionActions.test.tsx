import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionActions } from './SelectionActions';

const fresh = { kind: 'create', left: 10, top: 20, above: 0 } as const;

describe('SelectionActions (the highlight menu, phase 21)', () => {
  it('offers the four colours for a selection, without dropping the selection on press', () => {
    const onColor = vi.fn();
    render(
      <SelectionActions
        action={fresh}
        unsavedReason={null}
        onColor={onColor}
        onRemove={() => {}}
      />,
    );
    const colours = screen.getByRole('radiogroup', { name: 'Highlight colour' });
    expect(
      [...colours.querySelectorAll('[role="radio"]')].map((radio) =>
        radio.getAttribute('aria-label'),
      ),
    ).toEqual(['Yellow', 'Green', 'Blue', 'Pink']);
    const green = screen.getByRole('radio', { name: 'Green' });
    expect(green).toHaveAttribute('aria-checked', 'false');
    const pointerDown = createEvent.pointerDown(green);
    fireEvent(green, pointerDown);
    // Cancelling pointerdown suppresses WebKit's synthesized click after a touch tap.
    expect(pointerDown.defaultPrevented).toBe(false);
    const mouseDown = createEvent.mouseDown(green);
    fireEvent(green, mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);

    fireEvent.click(green);
    expect(onColor).toHaveBeenCalledWith('green');
    expect(screen.queryByRole('button', { name: 'Remove highlight' })).toBeNull();
  });

  it('shows why highlighting is unavailable for a book that is not saved', () => {
    render(
      <SelectionActions
        action={fresh}
        unsavedReason="Highlights need this book saved on this device."
        onColor={() => {}}
        onRemove={() => {}}
      />,
    );
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByText('Highlights need this book saved on this device.')).toBeVisible();
  });

  it('rings a chosen highlight’s colour and offers Remove highlight', () => {
    const onRemove = vi.fn();
    render(
      <SelectionActions
        action={{ kind: 'remove', id: 'h1', left: 10, top: 20, above: 0 }}
        color="blue"
        unsavedReason={null}
        onColor={() => {}}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Blue' }).tabIndex).toBe(0);
    expect(screen.getByRole('radio', { name: 'Yellow' }).tabIndex).toBe(-1);
    fireEvent.click(screen.getByRole('button', { name: 'Remove highlight' }));
    expect(onRemove).toHaveBeenCalledWith('h1');
  });

  it('renders nothing without an action', () => {
    const { container } = render(
      <SelectionActions
        action={null}
        unsavedReason={null}
        onColor={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
