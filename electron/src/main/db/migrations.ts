import type Database from 'better-sqlite3';

/**
 * Fresh schema (v2). SSO rows must satisfy the CHECK; IAM rows use empty strings for unused SSO columns.
 */
const SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS secrets (
  secret_key TEXT PRIMARY KEY NOT NULL,
  ciphertext_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('iam', 'sso')),
  aws_account_id TEXT NOT NULL DEFAULT '',
  profile_name TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'us-east-1',
  output TEXT NOT NULL DEFAULT 'json',
  start_url TEXT NOT NULL DEFAULT '',
  sso_region TEXT NOT NULL DEFAULT '',
  sso_session_name TEXT NOT NULL DEFAULT '',
  secret_key TEXT NOT NULL UNIQUE,
  expires_at TEXT,
  logo_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    auth_type = 'iam' OR (
      length(trim(start_url)) > 0 AND
      length(trim(aws_account_id)) > 0 AND
      length(trim(role_name)) > 0 AND
      length(trim(sso_region)) > 0 AND
      length(trim(sso_session_name)) > 0
    )
  )
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_profile_name ON accounts(profile_name);
`;

export function runMigrations(database: Database.Database): void {
  const current = database.pragma('user_version', { simple: true }) as number;
  if (current >= 2) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS secrets;
    DROP TABLE IF EXISTS settings;
    PRAGMA foreign_keys = ON;
  `);

  database.exec(SCHEMA_V2);
  database.pragma('user_version = 2');
}
