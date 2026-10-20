import { useEffect, useRef, useState } from 'react';
import { MIN_QUERY_LENGTH, searchable } from '../core/search';
import type { SearchResult, SearchState } from './useSearch';

/** Typing pauses this long before a search starts. */
const TYPING_DELAY_MS = 300;

function statusText(state: SearchState, pageCount: number): string {
  switch (state.status) {
    case 'idle':
      return state.query.trim() ? `Type at least ${MIN_QUERY_LENGTH} letters.` : '';
    case 'failed':
      return "This book couldn't be searched. Try again.";
    case 'searching':
      return `Searching… ${state.pagesSearched} of ${pageCount} pages`;
    case 'done': {
      if (state.results.length === 0) return 'No matches.';
      const pages = new Set(state.results.map((r) => r.pageIndex)).size;
      const count = `${state.results.length}${state.truncated ? '+' : ''}`;
      return `${count} ${state.results.length === 1 ? 'match' : 'matches'} on ${pages} ${pages === 1 ? 'page' : 'pages'}`;
    }
  }
}

export function SearchPanel({
  id,
  state,
  pageCount,
  current,
  onSearch,
  onChoose,
}: {
  id: string;
  state: SearchState;
  pageCount: number;
  /** Index into the results of the match now shown, or null. */
  current: number | null;
  onSearch(query: string): void;
  onChoose(index: number): void;
}) {
  const [query, setQuery] = useState(state.query);
  const input = useRef<HTMLInputElement>(null);
  const results: SearchResult[] =
    state.status === 'searching' || state.status === 'done' ? state.results : [];

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  // Search once typing pauses.
  useEffect(() => {
    if (query === state.query) return;
    const timer = setTimeout(() => onSearch(query), TYPING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, state.query, onSearch]);

  const step = (delta: number) => {
    if (results.length === 0) return;
    const next =
      current === null
        ? delta > 0
          ? 0
          : results.length - 1
        : (current + delta + results.length) % results.length;
    onChoose(next);
  };

  return (
    <section id={id} className="side-panel search-panel" aria-label="Search">
      <h2>Search</h2>
      <form
        role="search"
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          // Enter searches now, or goes to the next match of a finished search.
          if (query !== state.query) onSearch(query);
          else step(1);
        }}
      >
        <input
          ref={input}
          type="search"
          className="picker"
          aria-label="Search in book"
          placeholder="Search in book"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </form>
      <p className="panel-note" role="status">
        {statusText(state, pageCount)}
      </p>
      {results.length > 0 && (
        <div className="search-steps">
          <button type="button" className="button secondary" onClick={() => step(-1)}>
            Previous match
          </button>
          <span>{current === null ? '' : `${current + 1} of ${results.length}`}</span>
          <button type="button" className="button secondary" onClick={() => step(1)}>
            Next match
          </button>
        </div>
      )}
      {results.length > 0 && searchable(state.query) && (
        <ul aria-label="Search results">
          {results.map((result, index) => (
            <li key={`${result.pageIndex}:${result.occurrence}`}>
              <button
                type="button"
                className="panel-entry search-result"
                aria-current={index === current ? 'true' : undefined}
                onClick={() => onChoose(index)}
              >
                <strong>Page {result.pageIndex + 1}</strong>
                <span className="note-quote">
                  {result.snippet.before}
                  <mark>{result.snippet.match}</mark>
                  {result.snippet.after}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
