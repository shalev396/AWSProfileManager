import type Database from 'better-sqlite3';
import { getDatabase } from '../db/sqlite';
import type { AccountRow, AccountSummary, AuthType } from './types';

function rowToAccount(r: Record<string, unknown>): AccountRow {
  return {
    id: r.id as string,
    name: r.name as string,
    authType: r.auth_type as AuthType,
    awsAccountId: (r.aws_account_id as string) ?? '',
    profileName: r.profile_name as string,
    roleName: (r.role_name as string) ?? '',
    region: (r.region as string) || 'us-east-1',
    output: (r.output as string) || 'json',
    startUrl: (r.start_url as string) ?? '',
    ssoRegion: (r.sso_region as string) ?? '',
    ssoSessionName: (r.sso_session_name as string) ?? '',
    secretKey: r.secret_key as string,
    expiresAt: (r.expires_at as string) ?? null,
    logoPath: (r.logo_path as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toSummary(row: AccountRow): AccountSummary {
  return {
    id: row.id,
    name: row.name,
    authType: row.authType,
    profileName: row.profileName,
    region: row.region,
    output: row.output,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.awsAccountId ? { awsAccountId: row.awsAccountId } : {}),
    ...(row.roleName ? { roleName: row.roleName } : {}),
    ...(row.startUrl ? { startUrl: row.startUrl } : {}),
    ...(row.ssoRegion ? { ssoRegion: row.ssoRegion } : {}),
    ...(row.ssoSessionName ? { ssoSessionName: row.ssoSessionName } : {}),
    ...(row.expiresAt != null ? { expiresAt: row.expiresAt } : {}),
    ...(row.logoPath != null ? { logoPath: row.logoPath } : {}),
  };
}

export class AccountRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  listAccounts(): AccountSummary[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, auth_type, aws_account_id, profile_name, role_name, region, output,
                start_url, sso_region, sso_session_name, secret_key, expires_at, logo_path, created_at, updated_at
         FROM accounts ORDER BY name COLLATE NOCASE`,
      )
      .all() as Record<string, unknown>[];
    return rows.map((r) => toSummary(rowToAccount(r)));
  }

  getById(id: string): AccountRow | null {
    const r = this.db
      .prepare(
        `SELECT id, name, auth_type, aws_account_id, profile_name, role_name, region, output,
                start_url, sso_region, sso_session_name, secret_key, expires_at, logo_path, created_at, updated_at
         FROM accounts WHERE id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;
    return r ? rowToAccount(r) : null;
  }

  getByProfileName(profileName: string): AccountRow | null {
    const r = this.db
      .prepare(
        `SELECT id, name, auth_type, aws_account_id, profile_name, role_name, region, output,
                start_url, sso_region, sso_session_name, secret_key, expires_at, logo_path, created_at, updated_at
         FROM accounts WHERE profile_name = ?`,
      )
      .get(profileName) as Record<string, unknown> | undefined;
    return r ? rowToAccount(r) : null;
  }

  insertAccount(row: Omit<AccountRow, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }): void {
    this.db
      .prepare(
        `INSERT INTO accounts (
          id, name, auth_type, aws_account_id, profile_name, role_name, region, output,
          start_url, sso_region, sso_session_name, secret_key, expires_at, logo_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.name,
        row.authType,
        row.awsAccountId,
        row.profileName,
        row.roleName,
        row.region,
        row.output,
        row.startUrl,
        row.ssoRegion,
        row.ssoSessionName,
        row.secretKey,
        row.expiresAt,
        row.logoPath,
        row.createdAt,
        row.updatedAt,
      );
  }

  updateAccount(
    id: string,
    patch: Partial<
      Pick<
        AccountRow,
        | 'name'
        | 'awsAccountId'
        | 'roleName'
        | 'region'
        | 'output'
        | 'startUrl'
        | 'ssoRegion'
        | 'ssoSessionName'
        | 'expiresAt'
        | 'logoPath'
      >
    >,
  ): void {
    const fields: string[] = [];
    const values: unknown[] = [];
    const map: Record<string, keyof typeof patch> = {
      name: 'name',
      aws_account_id: 'awsAccountId',
      role_name: 'roleName',
      region: 'region',
      output: 'output',
      start_url: 'startUrl',
      sso_region: 'ssoRegion',
      sso_session_name: 'ssoSessionName',
      expires_at: 'expiresAt',
      logo_path: 'logoPath',
    };
    for (const [col, key] of Object.entries(map)) {
      if (patch[key] !== undefined) {
        fields.push(`${col} = ?`);
        let v: unknown = patch[key];
        if (v === null && col !== 'logo_path' && col !== 'expires_at') {
          v = '';
        }
        values.push(v);
      }
    }
    if (fields.length === 0) {
      return;
    }
    const updatedAt = new Date().toISOString();
    fields.push('updated_at = ?');
    values.push(updatedAt);
    values.push(id);
    this.db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteAccount(id: string): void {
    this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  }

  getActiveAccountId(): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('activeAccountId') as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  setActiveAccountId(id: string | null): void {
    if (id === null) {
      this.db.prepare('DELETE FROM settings WHERE key = ?').run('activeAccountId');
      return;
    }
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES ('activeAccountId', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(id);
  }

  accountCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number };
    return row.c;
  }
}

let repoSingleton: AccountRepository | null = null;

export function getAccountRepository(): AccountRepository {
  if (!repoSingleton) {
    repoSingleton = new AccountRepository(getDatabase());
  }
  return repoSingleton;
}
