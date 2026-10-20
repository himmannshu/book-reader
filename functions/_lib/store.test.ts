// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { SyncItem } from '../../src/core/sync';
import { memoryDb } from './sqlite-test-db';
import { applyChanges, changesSince, migrate } from './store';

const item = (over: Partial<SyncItem> = {}): SyncItem => ({
  kind: 'bookmark',
  id: 'bm-1',
  bookId: 'book-1',
  updatedAt: 100,
  deleted: false,
  device: 'device-a',
  data: { label: 'Page 1' },
  ...over,
});

async function setup() {
  const db = memoryDb();
  await migrate(db);
  return db;
}

describe('sync store', () => {
  it('stores changes and returns them to another device, with a cursor', async () => {
    const db = await setup();
    await applyChanges(db, 'me@example.com', [item(), item({ id: 'bm-2' })]);
    const pulled = await changesSince(db, 'me@example.com', 0, 'device-b');
    expect(pulled.items.map((i) => i.id)).toEqual(['bm-1', 'bm-2']);
    expect(pulled.items[0]).toEqual(item());
    expect(pulled.cursor).toBeGreaterThan(0);

    const again = await changesSince(db, 'me@example.com', pulled.cursor, 'device-b');
    expect(again.items).toEqual([]);
  });

  it('does not echo a device its own changes, but still moves its cursor past them', async () => {
    const db = await setup();
    await applyChanges(db, 'me@example.com', [item({ device: 'device-a' })]);
    const own = await changesSince(db, 'me@example.com', 0, 'device-a');
    expect(own.items).toEqual([]);
    expect(own.cursor).toBeGreaterThan(0);
  });

  it('keeps the later write (last write wins) and ignores older ones', async () => {
    const db = await setup();
    await applyChanges(db, 'me@example.com', [item({ updatedAt: 200, data: { label: 'new' } })]);
    const result = await applyChanges(db, 'me@example.com', [
      item({ updatedAt: 100, device: 'device-b', data: { label: 'old' } }),
    ]);
    expect(result.applied).toBe(0);
    const pulled = await changesSince(db, 'me@example.com', 0, 'device-c');
    expect(pulled.items).toHaveLength(1);
    expect(pulled.items[0]?.data).toEqual({ label: 'new' });
  });

  it('keeps users apart', async () => {
    const db = await setup();
    await applyChanges(db, 'a@example.com', [item()]);
    expect((await changesSince(db, 'b@example.com', 0, 'device-b')).items).toEqual([]);
  });

  it('a deleted book takes its annotations with it, everywhere', async () => {
    const db = await setup();
    await applyChanges(db, 'me@example.com', [
      item({ kind: 'book', id: 'book-1', bookId: 'book-1', data: { title: 'B' } }),
      item({ kind: 'note', id: 'n-1', updatedAt: 150 }),
      item({ kind: 'bookmark', id: 'bm-1' }),
    ]);
    const before = await changesSince(db, 'me@example.com', 0, 'device-b');
    await applyChanges(db, 'me@example.com', [
      item({
        kind: 'book',
        id: 'book-1',
        bookId: 'book-1',
        updatedAt: 300,
        deleted: true,
        data: null,
      }),
    ]);
    const after = await changesSince(db, 'me@example.com', before.cursor, 'device-b');
    expect(after.items.map((i) => `${i.kind}:${i.id}:${i.deleted}`).sort()).toEqual([
      'book:book-1:true',
      'bookmark:bm-1:true',
      'note:n-1:true',
    ]);
    expect(after.items.every((i) => i.data === null)).toBe(true);
  });

  it('pages large result sets', async () => {
    const db = await setup();
    const many = Array.from({ length: 7 }, (_, n) => item({ id: `bm-${n}` }));
    await applyChanges(db, 'me@example.com', many);
    const first = await changesSince(db, 'me@example.com', 0, 'device-b', 5);
    expect(first.items).toHaveLength(5);
    expect(first.more).toBe(true);
    const rest = await changesSince(db, 'me@example.com', first.cursor, 'device-b', 5);
    expect(rest.items).toHaveLength(2);
    expect(rest.more).toBe(false);
  });

  it('migrating twice is harmless', async () => {
    const db = await setup();
    await migrate(db);
    await applyChanges(db, 'me@example.com', [item()]);
    expect((await changesSince(db, 'me@example.com', 0, 'x')).items).toHaveLength(1);
  });
});
