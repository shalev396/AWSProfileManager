import Database from 'better-sqlite3';
import * as fs from 'fs';
import { getSqlitePath, getUserDataRoot } from '../bootstrap/appPaths';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

export function openDatabase(): Database.Database {
  if (db) {
    return db;
  }
  fs.mkdirSync(getUserDataRoot(), { recursive: true });
  db = new Database(getSqlitePath());
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not open; call openDatabase() after app is ready');
  }
  return db;
}
