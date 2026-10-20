import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SyncStatus } from '../sync/engine';
import type { UploadStatus } from '../sync/uploader';
import { SyncStatusLine } from './SyncStatusLine';

function show(status: SyncStatus, uploads?: UploadStatus) {
  const onSyncNow = vi.fn();
  const view = render(<SyncStatusLine status={status} uploads={uploads} onSyncNow={onSyncNow} />);
  return { onSyncNow, ...view };
}

describe('SyncStatusLine', () => {
  it.each([
    [{ state: 'syncing' }, 'Syncing…'],
    [{ state: 'synced', at: 0 }, 'Synced'],
    [{ state: 'offline' }, 'Offline: changes will sync when you are back online'],
    [{ state: 'signed-out' }, 'Sign in again to sync'],
    [{ state: 'failed' }, 'Sync failed'],
  ] as [SyncStatus, string][])('says %j as "%s"', (status, text) => {
    show(status);
    expect(screen.getByTestId('sync-status')).toHaveTextContent(text);
  });

  it('offers Sync now, and Retry after a failure', () => {
    const { onSyncNow } = show({ state: 'synced', at: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(onSyncNow).toHaveBeenCalledTimes(1);

    const failed = show({ state: 'failed' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0] as HTMLElement);
    expect(failed.onSyncNow).toHaveBeenCalledTimes(1);
  });

  it('disables the button while syncing', () => {
    show({ state: 'syncing' });
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeDisabled();
  });

  it('shows nothing where sync is not set up', () => {
    const { container } = show({ state: 'unavailable' });
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [{ state: 'uploading', books: 1, percent: 35 }, 'Uploading 1 book (35%)'],
    [{ state: 'uploading', books: 3, percent: 0 }, 'Uploading 3 books (0%)'],
    [{ state: 'full' }, 'Cloud storage is full (9 GB). New books stay on this device only.'],
    [{ state: 'idle' }, ''],
  ] as [UploadStatus, string][])('shows uploads %j as "%s"', (uploads, text) => {
    show({ state: 'synced', at: 0 }, uploads);
    expect(screen.getByTestId('upload-status')).toHaveTextContent(text);
  });
});
