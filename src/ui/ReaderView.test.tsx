import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PdfDoc } from '../engine/types';
import { ReaderView } from './ReaderView';

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
    render(<ReaderView doc={doc} />);
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
