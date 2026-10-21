import type { SyncStatus } from '../sync/engine';
import type { UploadStatus } from '../sync/uploader';
import { Button } from './controls';
import { Icon } from './icons';

const TEXT: Record<Exclude<SyncStatus['state'], 'unavailable'>, string> = {
  idle: '',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline: changes will sync when you are back online',
  'signed-out': 'Sign in again to sync',
  failed: 'Sync failed',
};

function uploadText(uploads: UploadStatus | undefined): string {
  switch (uploads?.state) {
    case 'uploading':
      return `Uploading ${uploads.books} ${uploads.books === 1 ? 'book' : 'books'} (${uploads.percent}%)`;
    case 'full':
      return 'Cloud storage is full (9 GB). New books stay on this device only.';
    default:
      return '';
  }
}

/** The reader's badge words, for the states that need the reader (phase 19). */
const BADGE: Partial<Record<SyncStatus['state'], string>> = {
  offline: 'Offline',
  'signed-out': 'Sign in to sync',
  failed: 'Sync failed',
};

/**
 * Sync state, book uploads (phase 09b) and a Sync now button. Nothing at all where sync isn't set
 * up (local previews). `compact` is the reader's form (phase 19): a badge only when sync needs the
 * reader (offline, failed, signed out, storage full), with the full words announced politely.
 */
export function SyncStatusLine({
  status,
  uploads,
  onSyncNow,
  compact = false,
}: {
  status: SyncStatus;
  uploads?: UploadStatus;
  onSyncNow?(): void;
  compact?: boolean;
}) {
  if (status.state === 'unavailable') return null;
  if (compact) {
    const badge = uploads?.state === 'full' ? 'Storage full' : BADGE[status.state];
    const words = [TEXT[status.state], uploadText(uploads)].filter(Boolean).join('. ');
    return (
      <span className="sync-status--compact">
        <span className="visually-hidden">
          <span data-testid="sync-status" data-state={status.state} aria-live="polite">
            {TEXT[status.state]}
          </span>
          <span data-testid="upload-status" aria-live="polite">
            {uploadText(uploads)}
          </span>
        </span>
        {badge && (
          <span
            className={`br-badge br-badge--${status.state === 'offline' ? 'neutral' : 'danger'}`}
            title={words}
            aria-hidden="true"
          >
            <Icon name={status.state === 'offline' ? 'offline' : 'alert'} size={13} />
            {badge}
          </span>
        )}
      </span>
    );
  }
  const failed = status.state === 'failed';
  const title =
    status.state === 'synced'
      ? `Last synced ${new Date(status.at).toLocaleTimeString()}`
      : undefined;
  return (
    <div className="sync-status">
      <span data-testid="sync-status" data-state={status.state} aria-live="polite" title={title}>
        {TEXT[status.state]}
      </span>
      <span data-testid="upload-status" className="upload-status" aria-live="polite">
        {uploadText(uploads)}
      </span>
      <Button disabled={status.state === 'syncing'} onClick={onSyncNow}>
        {failed ? 'Retry' : 'Sync now'}
      </Button>
    </div>
  );
}
