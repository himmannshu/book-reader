import type { SyncStatus } from '../sync/engine';
import type { UploadStatus } from '../sync/uploader';

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

/**
 * Sync state, book uploads (phase 09b) and a Sync now button. Nothing at all where sync isn't set
 * up (local previews).
 */
export function SyncStatusLine({
  status,
  uploads,
  onSyncNow,
}: {
  status: SyncStatus;
  uploads?: UploadStatus;
  onSyncNow(): void;
}) {
  if (status.state === 'unavailable') return null;
  const failed = status.state === 'failed';
  const title =
    status.state === 'synced'
      ? `Last synced ${new Date(status.at).toLocaleTimeString()}`
      : undefined;
  return (
    <div className="sync-status">
      <span data-testid="sync-status" aria-live="polite" title={title}>
        {TEXT[status.state]}
      </span>
      <span data-testid="upload-status" className="upload-status" aria-live="polite">
        {uploadText(uploads)}
      </span>
      <button
        type="button"
        className="button secondary"
        disabled={status.state === 'syncing'}
        onClick={onSyncNow}
      >
        {failed ? 'Retry' : 'Sync now'}
      </button>
    </div>
  );
}
