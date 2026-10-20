// Test-only SqlDb over Node's built-in SQLite (D1 is SQLite too). Not deployed: Pages only bundles
// what functions/api imports.
import { DatabaseSync } from 'node:sqlite';
import type { SqlDb, SqlValue } from './store';

export function memoryDb(): SqlDb {
  const db = new DatabaseSync(':memory:');
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async all<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async run(sql, params = []) {
      db.prepare(sql).run(...params);
    },
  };
}
