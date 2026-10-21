import { useEffect, useRef, useState } from 'react';
import { MIN_QUERY_LENGTH, searchable } from '../core/search';
import type { SearchResult, SearchState } from './useSearch';
import { IconButton } from './controls';

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
      // When the list is cut short, both numbers are lower bounds.
      const more = state.truncated ? '+' : '';
      const count = `${state.results.length}${more}`;
      return `${count} ${state.results.length === 1 ? 'match' : 'matches'} on ${pages}${more} ${pages === 1 && !more ? 'page' : 'pages'}`;
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
  chapterFor,
}: {
  id: string;
  state: SearchState;
  pageCount: number;
  /** Index into the results of the match now shown, or null. */
  current: number | null;
  onSearch(query: string): void;
  onChoose(index: number): void;
  /** The chapter a page belongs to, when the book's outline is known (phase 20). */
  chapterFor?(pageIndex: number): string | undefined;
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

  // The search field (phase 20, the design's SearchField): the match count and previous and next
  // inside it, pinned above the results. Enter goes to the next match, Shift+Enter to the previous;
  // Escape clears the field, and a second Escape (the reader's) closes the panel.
  return (
    // No name of its own: it sits in the Search side panel, which names it (review N5).
    <section id={id} className="search-panel">
      <form
        role="search"
        className="br-search"
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
          className="br-search__input"
          aria-label="Search in book"
          placeholder="Search in book"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault();
              step(-1);
            } else if (event.key === 'Escape' && query !== '') {
              event.preventDefault();
              // Not the reader's Escape too: that would close the panel.
              event.stopPropagation();
              setQuery('');
              onSearch('');
            }
          }}
        />
        {query !== '' && (
          <IconButton
            icon="close"
            label="Clear search"
            size="sm"
            onClick={() => {
              setQuery('');
              onSearch('');
              input.current?.focus();
            }}
          />
        )}
        {results.length > 0 && (
          <>
            <span className="br-search__count" data-testid="search-count" aria-live="polite">
              {current === null ? results.length : `${current + 1} of ${results.length}`}
            </span>
            <IconButton icon="collapse" label="Previous match" size="sm" onClick={() => step(-1)} />
            <IconButton icon="expand" label="Next match" size="sm" onClick={() => step(1)} />
          </>
        )}
      </form>
      <p className="panel-note" role="status">
        {statusText(state, pageCount)}
      </p>
      {results.length > 0 && searchable(state.query) && (
        <ul aria-label="Search results" className="br-results">
          {results.map((result, index) => {
            const chapter = chapterFor?.(result.pageIndex);
            return (
              <li key={`${result.pageIndex}:${result.occurrence}`}>
                <button
                  type="button"
                  className={`panel-entry br-result${index === current ? ' is-active' : ''}`}
                  aria-current={index === current ? 'true' : undefined}
                  onClick={() => onChoose(index)}
                >
                  <span className="caption br-result__meta">
                    <span>p. {result.pageIndex + 1}</span>
                    {chapter && <span className="br-truncate">· {chapter}</span>}
                  </span>
                  <span className="br-result__text">
                    {result.snippet.before}
                    <mark>{result.snippet.match}</mark>
                    {result.snippet.after}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
