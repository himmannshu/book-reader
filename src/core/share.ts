// Sharing a highlighted passage (phase 17): the text another app receives. Pure logic.

/** Longest passage shared as is; longer ones are cut at a word with an ellipsis. */
export const MAX_EXCERPT = 1000;

export interface Excerpt {
  quote: string;
  title: string;
  pageIndex: number;
}

/** “The passage.”, then a line naming the book and its page. */
export function excerptText({ quote, title, pageIndex }: Excerpt): string {
  let text = quote.replace(/\s+/g, ' ').trim();
  if (text.length > MAX_EXCERPT) {
    const cut = text.lastIndexOf(' ', MAX_EXCERPT);
    // Without a space to cut at, cut by whole characters (an emoji is two code units).
    const kept =
      cut > 0
        ? text.slice(0, cut)
        : Array.from(text)
            .slice(0, MAX_EXCERPT / 2)
            .join('');
    text = `${kept.trimEnd()}…`;
  }
  const book = title.trim();
  const source = book ? `${book}, page ${pageIndex + 1}` : `page ${pageIndex + 1}`;
  return `“${text}”\n— ${source}`;
}
