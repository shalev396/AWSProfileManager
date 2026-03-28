/**
 * RULE: Plaintext secrets exist only transiently in the main process. Persist only via this service.
 * Renderer must never receive decrypt APIs or raw ciphertext handling.
 */

import { safeStorage } from 'electron';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/sqlite';

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function encryptionDebugInfo(): string {
  try {
    const backend = (safeStorage as { getSelectedStorageBackend?: () => string })
      .getSelectedStorageBackend?.();
    return backend ? `safeStorage backend: ${backend}` : 'safeStorage backend: (n/a)';
  } catch {
    return 'safeStorage backend: unknown';
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export class SecretService {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  saveSecret(secretKey: string, plaintextJson: string): void {
    if (!isEncryptionAvailable()) {
      throw new Error('OS encryption is not available; cannot store secrets on this machine.');
    }
    const buf = safeStorage.encryptString(plaintextJson);
    const ciphertextBase64 = buf.toString('base64');
    const t = nowIso();
    const stmt = this.db.prepare(`
      INSERT INTO secrets (secret_key, ciphertext_base64, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(secret_key) DO UPDATE SET
        ciphertext_base64 = excluded.ciphertext_base64,
        updated_at = excluded.updated_at
    `);
    stmt.run(secretKey, ciphertextBase64, t, t);
  }

  getSecret(secretKey: string): string | null {
    if (!isEncryptionAvailable()) {
      throw new Error('OS encryption is not available.');
    }
    const row = this.db
      .prepare('SELECT ciphertext_base64 FROM secrets WHERE secret_key = ?')
      .get(secretKey) as { ciphertext_base64: string } | undefined;
    if (!row) {
      return null;
    }
    const buf = Buffer.from(row.ciphertext_base64, 'base64');
    return safeStorage.decryptString(buf);
  }

  deleteSecret(secretKey: string): void {
    this.db.prepare('DELETE FROM secrets WHERE secret_key = ?').run(secretKey);
  }
}

let singleton: SecretService | null = null;

export function getSecretService(): SecretService {
  if (!singleton) {
    singleton = new SecretService(getDatabase());
  }
  return singleton;
}
