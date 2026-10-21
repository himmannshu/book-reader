// Phase 18: the design system's basic controls.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, EmptyState, IconButton, ProgressBar, SegmentedControl, Toast } from './controls';
import { ICON_NAMES, Icon } from './icons';

describe('Icon', () => {
  it('has the design’s 47 icons, drawn at a 1.75 px stroke in the text colour', () => {
    expect(ICON_NAMES).toHaveLength(47);
    const { container } = render(<Icon name="contents" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '1.75');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.children.length).toBeGreaterThan(0);
  });
});

describe('Button', () => {
  it('is a secondary button by default and never submits a form by accident', () => {
    render(<Button>Export notes</Button>);
    const button = screen.getByRole('button', { name: 'Export notes' });
    expect(button).toHaveClass('br-btn', 'br-btn--secondary', 'br-btn--md');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('takes a variant, a size and an icon', () => {
    render(
      <Button variant="danger" size="sm" icon="delete">
        Delete everywhere
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Delete everywhere' });
    expect(button).toHaveClass('br-btn--danger', 'br-btn--sm');
    expect(button.querySelector('svg')).not.toBeNull();
  });
});

describe('IconButton', () => {
  it('is named and titled by its label, and shows a pressed state', () => {
    const onClick = vi.fn();
    render(<IconButton icon="listen" label="Listen" pressed onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Listen', pressed: true });
    expect(button).toHaveAttribute('title', 'Listen');
    expect(button).toHaveClass('br-iconbtn', 'br-iconbtn--plain', 'br-iconbtn--md');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('ProgressBar', () => {
  it('reports a whole percentage, kept between 0 and 100', () => {
    const { rerender } = render(<ProgressBar value={0.505} label="Progress in Middlemarch" />);
    const bar = screen.getByRole('progressbar', { name: 'Progress in Middlemarch' });
    expect(bar).toHaveAttribute('aria-valuenow', '51');
    rerender(<ProgressBar value={1.4} label="Progress in Middlemarch" showValue />);
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('announces a failure as an alert, with a way to dismiss it', () => {
    const onDismiss = vi.fn();
    render(
      <Toast tone="danger" onDismiss={onDismiss}>
        This file isn't a readable PDF.
      </Toast>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("This file isn't a readable PDF.");
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('announces other messages politely', () => {
    render(<Toast tone="positive">Saved on this device.</Toast>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved on this device.');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('says what will appear, with a heading on a screen and none in a panel', () => {
    const { rerender } = render(
      <EmptyState icon="library" title="Your library is empty">
        No books yet. Open a PDF to start.
      </EmptyState>,
    );
    expect(screen.getByRole('heading', { name: 'Your library is empty' })).toBeInTheDocument();
    rerender(
      <EmptyState icon="note" compact>
        No notes yet.
      </EmptyState>,
    );
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'width', label: 'Width', icon: 'fit-width' },
    { value: 'page', label: 'Page', icon: 'fit-page' },
    { value: 'custom', label: 'Custom' },
  ] as const;

  it('is a named radio group whose chosen option is checked and the only Tab stop', () => {
    render(<SegmentedControl label="Fit" options={options} value="page" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Fit' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
    expect(screen.getByRole('radio', { name: 'Page' })).toHaveClass('is-selected');
  });

  it('chooses with a click, and with the arrow keys (wrapping, focus following)', () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Fit" options={options} value="width" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(onChange).toHaveBeenLastCalledWith('custom');
    const width = screen.getByRole('radio', { name: 'Width' });
    fireEvent.keyDown(width, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('page');
    expect(screen.getByRole('radio', { name: 'Page' })).toHaveFocus();
    fireEvent.keyDown(width, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('custom');
  });

  it('shows a paper swatch for each theme, and names icon-only options', () => {
    render(
      <SegmentedControl
        label="View"
        iconOnly
        options={[
          { value: 'grid', label: 'Grid', icon: 'grid' },
          { value: 'list', label: 'List', icon: 'list' },
        ]}
        value="grid"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('title', 'Grid');
    const { container } = render(
      <SegmentedControl
        label="Theme"
        options={[{ value: 'sepia', label: 'Sepia', swatch: 'sepia' }]}
        value="sepia"
        onChange={() => {}}
      />,
    );
    expect(container.querySelector('.br-seg__swatch--sepia')).not.toBeNull();
  });
});
