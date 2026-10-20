import type { SyncStatus } from '../sync/engine';

const TEXT: Record<Exclude<SyncStatus['state'], 'unavailable'>, string> = {
  idle: '',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline: changes will sync when you are back online',
  'signed-out': 'Sign in again to sync',
  failed: 'Sync failed',
};

/** Sync state and a Sync now button. Nothing at all where sync isn't set up (local previews). */
export function SyncStatusLine({ status, onSyncNow }: { status: SyncStatus; onSyncNow(): void }) {
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
