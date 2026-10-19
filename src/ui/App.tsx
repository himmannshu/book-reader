import { useEffect, useState, type ChangeEvent } from 'react';
import { markOpened, markOpenStart } from '../core/perf-marks';
import { pdfjsEngine } from '../engine/pdfjs-engine';
import { PdfOpenError, type PdfDoc, type PdfEngine } from '../engine/types';
import { ReaderView } from './ReaderView';

interface OpenBook {
  doc: PdfDoc;
  fileName: string;
}

function messageFor(error: unknown): string {
  if (error instanceof PdfOpenError) {
    switch (error.kind) {
      case 'invalid':
        return "This file isn't a readable PDF.";
      case 'password':
        return "This PDF is password-protected. Password-protected PDFs aren't supported yet.";
      case 'unknown':
        break;
    }
  }
  return "This PDF couldn't be opened.";
}

export function App({ engine = pdfjsEngine }: { engine?: PdfEngine }) {
  const [book, setBook] = useState<OpenBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Free the previous document's memory and worker when another book replaces it.
  useEffect(() => {
    const doc = book?.doc;
    return () => {
      void doc?.destroy();
    };
  }, [book]);

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // Allow choosing the same file again.
    if (!file) return;

    markOpenStart();
    setOpening(true);
    setError(null);
    try {
      const doc = await engine.open(new Uint8Array(await file.arrayBuffer()));
      markOpened();
      setBook({ doc, fileName: file.name });
    } catch (err) {
      if (!(err instanceof PdfOpenError) || err.kind === 'unknown') {
        console.error('Opening the PDF failed', err);
      }
      setError(messageFor(err));
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Book Reader</h1>
        <label className="button">
          Open PDF
          <input
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => void onFileChosen(event)}
            disabled={opening}
          />
        </label>
        {book && (
          <p className="book-info" data-testid="book-info">
            {book.fileName} · {book.doc.pageCount} {book.doc.pageCount === 1 ? 'page' : 'pages'}
          </p>
        )}
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {book ? (
        <ReaderView doc={book.doc} />
      ) : (
        <p className="empty-state">Open a PDF to start reading.</p>
      )}
    </div>
  );
}
