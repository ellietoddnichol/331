import Database from 'better-sqlite3';

let _db: Database.Database | null = null;

export function initDb(): void {
  const dbPath = process.env.DATABASE_URL || 'estimator.db';
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
}

const db = new Proxy({} as Database.Database, {
  get(_target, prop: string | symbol) {
    if (!_db) throw new Error('Database not initialized. Call initDb() first.');
    const value = Reflect.get(_db, prop);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(_db) : value;
  },
});

export default db;
