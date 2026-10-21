import { useState } from 'react';
import { formatSize } from '../core/library';
import type { ReadingState } from '../core/reading-state';
import { readingProgress, shelfStatus, type ShelfView } from '../core/shelf';
import type { BookRecord } from '../storage/types';
import { Badge, Button, IconButton, ProgressBar, cx } from './controls';
import { RowMenu, type RowMenuItem } from './RowMenu';

type Confirming = 'device' | 'everywhere' | null;

interface BookCardProps {
  book: BookRecord;
  layout: ShelfView;
  coverUrl?: string;
  author?: string;
  state?: ReadingState;
  /** Whether a book from another device can be downloaded here. */
  canDownload: boolean;
  /** This book's download in progress, if any. */
  download: { percent: number } | null;
  /** Another book is downloading, or a book is opening. */
  locked: boolean;
  busy: boolean;
  onOpen(): void;
  onCancelDownload(): void;
  onRemoveFromDevice(): void;
  onDeleteEverywhere(): void;
}

/**
 * One book on the shelf (phase 22, the design's BookCard): its cover, title, author, progress or
 * one status badge, and a More menu. A grid card or a row. The cover button is named by the title.
 * A book without a drawn cover gets a typographic one. Removing asks first, in the card.
 */
export function BookCard({
  book,
  layout,
  coverUrl,
  author,
  state,
  canDownload,
  download,
  locked,
  busy,
  onOpen,
  onCancelDownload,
  onRemoveFromDevice,
  onDeleteEverywhere,
}: BookCardProps) {
  const [confirming, setConfirming] = useState<Confirming>(null);
  const status = shelfStatus(book, state);
  const here = status !== 'cloud';
  const openable = here || canDownload;
  const progress = readingProgress(state);

  const cover = (
    <span className="br-book__cover">
      {coverUrl ? (
        <img className="cover" src={coverUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="br-book__gen cover-placeholder" aria-hidden="true">
          <span className="br-book__gen-title">{book.title}</span>
          {author && <span className="br-book__gen-author">{author}</span>}
        </span>
      )}
    </span>
  );

  const badge = download ? (
    <Badge tone="accent" icon="sync">
      {`Downloading… ${download.percent}%`}
    </Badge>
  ) : status === 'cloud' ? (
    <Badge icon="cloud">In cloud</Badge>
  ) : status === 'unread' ? (
    <Badge tone="accent">New</Badge>
  ) : status === 'finished' ? (
    <Badge tone="positive" icon="check">
      Finished
    </Badge>
  ) : null;

  const note = download
    ? null
    : !here
      ? canDownload
        ? `On your other devices · ${formatSize(book.byteSize)} · downloads when you open it`
        : 'On your other devices: open its PDF here to read it.'
      : null;

  const items: RowMenuItem[] = [
    ...(here
      ? [
          {
            label: 'Remove from this device',
            icon: 'minus' as const,
            onSelect: () => setConfirming('device'),
          },
        ]
      : []),
    { label: 'Delete everywhere', icon: 'close', onSelect: () => setConfirming('everywhere') },
  ];

  return (
    <li
      className={cx(
        'library-item br-book',
        `br-book--${layout === 'list' ? 'row' : 'grid'}`,
        !here && 'is-remote elsewhere',
      )}
    >
      {openable ? (
        <button
          type="button"
          className="br-book__open"
          aria-label={book.title}
          disabled={busy || locked}
          onClick={onOpen}
        >
          {cover}
        </button>
      ) : (
        <span className="br-book__open">{cover}</span>
      )}
      <div className="br-book__info">
        <h3 className="book-title br-book__title">{book.title}</h3>
        {author && <p className="caption br-book__author">{author}</p>}
        <div className="br-book__meta">
          {progress && !badge && (
            <ProgressBar
              value={progress.percent / 100}
              showValue
              label={`Progress in ${book.title}`}
            />
          )}
          {badge}
        </div>
        {progress && status === 'reading' && layout === 'list' && (
          <p className="caption library-progress">{`Page ${progress.page} of ${progress.pageCount} · ${progress.percent}%`}</p>
        )}
        {note && <p className="caption library-note">{note}</p>}
        {confirming && (
          <div className="library-confirm" role="group" aria-label={`Remove ${book.title}`}>
            <span>
              {confirming === 'device'
                ? 'Remove from this device? It stays on your other devices.'
                : 'Delete this book and its notes on every device?'}
            </span>
            <span className="library-confirm__actions">
              <Button
                size="sm"
                variant={confirming === 'everywhere' ? 'danger' : 'secondary'}
                onClick={() => {
                  setConfirming(null);
                  if (confirming === 'device') onRemoveFromDevice();
                  else onDeleteEverywhere();
                }}
              >
                {confirming === 'device' ? 'Remove from this device' : 'Delete everywhere'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
            </span>
          </div>
        )}
      </div>
      {download ? (
        <IconButton
          className="br-book__more"
          icon="close"
          label="Cancel download"
          size="sm"
          onClick={onCancelDownload}
        />
      ) : (
        <span className="br-book__more">
          <RowMenu items={items} disabled={busy} label={`More for ${book.title}`} />
        </span>
      )}
    </li>
  );
}
