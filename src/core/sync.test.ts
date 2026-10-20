import { describe, expect, it } from 'vitest';
import { nextStamp, shouldApply, type SyncItem } from './sync';

const item = (over: Partial<SyncItem> = {}): SyncItem => ({
  kind: 'bookmark',
  id: 'b1',
  bookId: 'book',
  updatedAt: 100,
  deleted: false,
  device: 'device-a',
  data: { label: 'Page 1' },
  ...over,
});

describe('shouldApply (last write wins)', () => {
  it('applies anything when nothing is stored yet', () => {
    expect(shouldApply(undefined, item())).toBe(true);
  });

  it('applies a newer write and ignores an older one', () => {
    expect(shouldApply(item({ updatedAt: 100 }), item({ updatedAt: 101 }))).toBe(true);
    expect(shouldApply(item({ updatedAt: 101 }), item({ updatedAt: 100 }))).toBe(false);
  });

  it('breaks an exact tie by device id, the same way on every device', () => {
    const fromA = item({ device: 'device-a' });
    const fromB = item({ device: 'device-b' });
    expect(shouldApply(fromA, fromB)).toBe(true);
    expect(shouldApply(fromB, fromA)).toBe(false);
  });

  it('ignores the same write arriving twice', () => {
    expect(shouldApply(item(), item())).toBe(false);
  });

  it('lets a newer deletion remove an item', () => {
    expect(shouldApply(item({ updatedAt: 100 }), item({ updatedAt: 200, deleted: true }))).toBe(
      true,
    );
  });

  it('never lets an older copy bring a deleted item back', () => {
    const tombstone = item({ updatedAt: 200, deleted: true, data: null });
    expect(shouldApply(tombstone, item({ updatedAt: 150 }))).toBe(false);
  });

  it('lets a genuinely newer write re-create a deleted item (re-bookmarking a page)', () => {
    const tombstone = item({ updatedAt: 200, deleted: true, data: null });
    expect(shouldApply(tombstone, item({ updatedAt: 300 }))).toBe(true);
  });
});

describe('nextStamp', () => {
  it('uses the clock when it is ahead of the previous stamp', () => {
    expect(nextStamp(100, 500)).toBe(500);
  });

  it('always moves forward, even if the clock went backwards', () => {
    expect(nextStamp(500, 100)).toBe(501);
    expect(nextStamp(500, 500)).toBe(501);
  });

  it('works for a first write', () => {
    expect(nextStamp(undefined, 42)).toBe(42);
  });
});
