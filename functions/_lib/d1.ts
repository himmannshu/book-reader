// SqlDb on a Cloudflare D1 binding.
import type { SqlDb } from './store';

export function d1(db: D1Database): SqlDb {
  return {
    async exec(sql) {
      // D1's exec() runs one statement per line; send statements one by one instead.
      for (const statement of sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)) {
        await db.prepare(statement).run();
      }
    },
    async all<T>(sql: string, params = []) {
      return (
        await db
          .prepare(sql)
          .bind(...params)
          .all<T>()
      ).results;
    },
    async run(sql, params = []) {
      await db
        .prepare(sql)
        .bind(...params)
        .run();
    },
  };
}
