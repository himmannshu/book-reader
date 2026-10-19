import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PdfOpenError, type PdfEngine } from '../engine/types';
import { App } from './App';

function failingEngine(error: Error): PdfEngine {
  return { open: () => Promise.reject(error) };
}

function chooseFile(name: string) {
  const input = screen.getByLabelText('Open PDF');
  fireEvent.change(input, { target: { files: [new File(['%PDF'], name)] } });
}

describe('App', () => {
  it('shows the app name as the page heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Book Reader' })).toBeInTheDocument();
  });

  it('invites the reader to open a PDF before any book is open', () => {
    render(<App />);
    expect(screen.getByText('Open a PDF to start reading.')).toBeInTheDocument();
  });

  it('explains when the chosen file is not a PDF', async () => {
    render(<App engine={failingEngine(new PdfOpenError('invalid', 'bad'))} />);
    chooseFile('notes.txt');
    expect(await screen.findByRole('alert')).toHaveTextContent("This file isn't a readable PDF.");
  });

  it('explains when the PDF is password-protected', async () => {
    render(<App engine={failingEngine(new PdfOpenError('password', 'locked'))} />);
    chooseFile('locked.pdf');
    expect(await screen.findByRole('alert')).toHaveTextContent('password-protected');
  });
});
