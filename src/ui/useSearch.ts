// Search in the open book (phase 13): one page at a time through the engine (PDF.js extracts the
// text in its worker), results shown as they arrive, page texts kept for the next search.
import { useCallback, useRef, useState } from 'react';
import { findMatches, matchSnippet, searchable, type Snippet } from '../core/search';
import type { PdfDoc } from '../engine/types';

/** Enough for any sensible query; more would only slow the list down. */
export const MAX_RESULTS = 1000;
/** Pages asked for ahead of the one being searched. */
const LOOKAHEAD = 4;

export interface SearchResult {
  pageIndex: number;
  /** Which match on its page (0-based), as the viewer counts them. */
  occurrence: number;
  snippet: Snippet;
}

export type SearchState =
  | { status: 'idle'; query: string }
  | {
      status: 'searching' | 'done';
      query: string;
      results: SearchResult[];
      pagesSearched: number;
      truncated: boolean;
    }
  | { status: 'failed'; query: string };

export function useSearch(doc: PdfDoc) {
  const [state, setState] = useState<SearchState>({ status: 'idle', query: '' });
  /** Page texts of this document, kept for the next search. */
  const texts = useRef<{ doc: PdfDoc; pages: Map<number, string> } | null>(null);
  const run = useRef(0);

  const search = useCallback(
    async (query: string) => {
      const id = ++run.current;
      if (texts.current?.doc !== doc) texts.current = { doc, pages: new Map() };
      const cache = texts.current.pages;
      if (!searchable(query)) {
        setState({ status: 'idle', query });
        return;
      }
      const results: SearchResult[] = [];
      let truncated = false;
      let shownAt = 0;
      setState({ status: 'searching', query, results: [], pagesSearched: 0, truncated });
      try {
        // Ask for a few pages ahead, so the worker never waits on a round trip; results still
        // come in page order.
        const pending = new Map<number, Promise<string>>();
        const textOf = (pageIndex: number): Promise<string> => {
          const known = cache.get(pageIndex);
          if (known !== undefined) return Promise.resolve(known);
          let request = pending.get(pageIndex);
          if (!request) {
            request = doc.pageText(pageIndex).then((text) => {
              cache.set(pageIndex, text);
              pending.delete(pageIndex);
              return text;
            });
            // Errors are reported when the page is reached.
            request.catch(() => undefined);
            pending.set(pageIndex, request);
          }
          return request;
        };
        for (let pageIndex = 0; pageIndex < doc.pageCount; pageIndex++) {
          for (let ahead = 1; ahead <= LOOKAHEAD && pageIndex + ahead < doc.pageCount; ahead++) {
            void textOf(pageIndex + ahead);
          }
          const text = await textOf(pageIndex);
          if (id !== run.current || doc.destroyed) return;
          const page = text;
          findMatches(page, query).forEach((match, occurrence) => {
            if (results.length < MAX_RESULTS) {
              results.push({ pageIndex, occurrence, snippet: matchSnippet(page, match) });
            } else truncated = true;
          });
          // Show progress a few times a second, not after every page.
          const now = performance.now();
          if (now - shownAt > 150) {
            shownAt = now;
            const pagesSearched = pageIndex + 1;
            setState({
              status: 'searching',
              query,
              results: [...results],
              pagesSearched,
              truncated,
            });
          }
          if (truncated) break;
        }
        if (id !== run.current) return;
        setState({ status: 'done', query, results, pagesSearched: doc.pageCount, truncated });
      } catch (error) {
        if (id !== run.current || doc.destroyed) return;
        console.error('Searching the book failed', error);
        setState({ status: 'failed', query });
      }
    },
    [doc],
  );

  return { state, search };
}
