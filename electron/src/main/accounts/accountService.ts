import { randomUUID } from 'crypto';
import { shell } from 'electron';
import * as awsFiles from '../awsFiles';
import {
  ensureOidcRegistration,
  pollSsoDeviceAuthorization,
  refreshSsoAccessToken,
  getCallerIdentityForResolvedAccount,
  type SsoDeviceAuthorizationStarted,
} from '../aws/awsMainProcess';
import { getSecretService, isEncryptionAvailable } from '../security/secretService';
import { getAccountRepository } from './accountRepository';
import type { AccountRow, AccountSummary, IamSecretPayload, ResolvedAccount, SsoSecretPayload } from './types';
import { copyLogoToStore, removeStoredLogo } from './logos';

export interface CreateIamInput {
  profileName: string;
  displayName?: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  output: string;
  logoPath?: string;
}

export interface CreateSsoInput {
  profileName: string;
  displayName?: string;
  ssoStartUrl: string;
  ssoAccountId: string;
  ssoRoleName: string;
  ssoRegion: string;
  ssoSessionName?: string;
  region: string;
  output: string;
  logoPath?: string;
}

export interface UpdateIamInput {
  displayName?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  output: string;
  logoPath?: string;
}

export interface UpdateSsoInput {
  displayName?: string;
  ssoStartUrl: string;
  ssoAccountId: string;
  ssoRoleName: string;
  ssoRegion: string;
  ssoSessionName?: string;
  region: string;
  output: string;
  logoPath?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseIamSecret(json: string): IamSecretPayload {
  const o = JSON.parse(json) as IamSecretPayload;
  return {
    accessKeyId: o.accessKeyId,
    secretAccessKey: o.secretAccessKey,
    sessionToken: o.sessionToken ?? null,
  };
}

function parseSsoSecret(json: string): SsoSecretPayload {
  if (!json || json === '{}') {
    return {};
  }
  return JSON.parse(json) as SsoSecretPayload;
}

function isUnauthorized(e: unknown): boolean {
  return (e as { name?: string }).name === 'UnauthorizedException';
}

/** Refresh OIDC access token this many seconds before its expiry. */
const SSO_ACCESS_REFRESH_SKEW_MS = 60_000;

export class AccountService {
  private secret() {
    return getSecretService();
  }

  private repo() {
    return getAccountRepository();
  }

  assertEncryption(): void {
    if (!isEncryptionAvailable()) {
      throw new Error(
        'OS secure storage is not available. On Linux, install libsecret / ensure a desktop keyring is running.',
      );
    }
  }

  /**
   * List accounts for the UI. For SSO, OIDC access-token expiry in the encrypted secret
   * (`accessTokenExpiresAt`) is the source of truth; `accounts.expires_at` can lag if older
   * code paths only updated one side — prefer the secret so the card matches right after SSO Login.
   */
  listSummaries(): AccountSummary[] {
    const summaries = this.repo().listAccounts();
    return summaries.map((summary) => {
      if (summary.authType !== 'sso') {return summary;}
      const row = this.repo().getById(summary.id);
      if (!row) {return summary;}
      const raw = this.secret().getSecret(row.secretKey);
      if (!raw) {return summary;}
      const s = parseSsoSecret(raw);
      const secretExp = s.accessTokenExpiresAt;
      if (secretExp != null && secretExp !== '' && !Number.isNaN(Date.parse(secretExp))) {
        if (row.expiresAt !== secretExp) {
          this.repo().updateAccount(summary.id, { expiresAt: secretExp });
        }
        return { ...summary, expiresAt: secretExp };
      }
      return summary;
    });
  }

  getActiveAccountId(): string | null {
    return this.repo().getActiveAccountId();
  }

  getById(id: string): AccountRow | null {
    return this.repo().getById(id);
  }

  getResolvedById(id: string): ResolvedAccount {
    const row = this.repo().getById(id);
    if (!row) {
      throw new Error('Account not found');
    }
    const raw = this.secret().getSecret(row.secretKey);
    if (raw === null) {
      throw new Error('Missing encrypted secret for account');
    }
    if (row.authType === 'iam') {
      return { ...row, secret: parseIamSecret(raw) };
    }
    return { ...row, secret: parseSsoSecret(raw) };
  }

  getPublicEditFields(id: string): { summary: AccountSummary; accessKeyId?: string } {
    const row = this.repo().getById(id);
    if (!row) {
      throw new Error('Account not found');
    }
    const summary: AccountSummary = {
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
    if (row.authType === 'iam') {
      const raw = this.secret().getSecret(row.secretKey);
      if (raw) {
        const p = parseIamSecret(raw);
        return { summary, accessKeyId: p.accessKeyId };
      }
    }
    return { summary };
  }

  private saveSsoSecret(row: AccountRow, payload: SsoSecretPayload): void {
    this.secret().saveSecret(row.secretKey, JSON.stringify(payload));
  }

  private async persistSsoRefreshAfterOidc(
    id: string,
    row: AccountRow,
    prev: SsoSecretPayload,
    refreshed: { accessToken: string; refreshToken?: string; expiresAt: string },
  ): Promise<void> {
    const next: SsoSecretPayload = {
      ...prev,
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.expiresAt,
      ...(refreshed.refreshToken !== undefined
        ? { refreshToken: refreshed.refreshToken }
        : {}),
    };
    this.saveSsoSecret(row, next);
    const ssoRegion = row.ssoRegion || row.region || 'us-east-1';
    if (row.startUrl) {
      const sessionName = row.ssoSessionName || `${row.profileName}-session`;
      await awsFiles.writeSsoLoginCache({
        startUrl: row.startUrl,
        ssoSessionName: sessionName,
        region: ssoRegion,
        clientId: next.oidcClientId!,
        clientSecret: next.oidcClientSecret!,
        accessToken: next.accessToken!,
        expiresAt: next.accessTokenExpiresAt!,
        ...(next.refreshToken !== undefined ? { refreshToken: next.refreshToken } : {}),
        ...(next.oidcRegistrationExpiresAt !== undefined
          ? { registrationExpiresAt: next.oidcRegistrationExpiresAt }
          : {}),
      });
    }
    this.repo().updateAccount(id, { expiresAt: refreshed.expiresAt });
  }

  /**
   * Ensures SSO OIDC access token is present and fresh enough for AWS SSO API calls.
   * Uses refresh_token without browser when possible.
   */
  private async ensureSsoOidcSessionUsable(
    id: string,
  ): Promise<{ ok: true } | { ok: false; requiresSsoLogin: true; message: string }> {
    const row = this.repo().getById(id);
    if (row?.authType !== 'sso') {
      return { ok: true };
    }
    const raw = this.secret().getSecret(row.secretKey);
    if (raw === null) {
      return {
        ok: false,
        requiresSsoLogin: true,
        message: 'Sign in with SSO Login before using this profile.',
      };
    }
    const s = parseSsoSecret(raw);
    if (!s.accessToken) {
      return {
        ok: false,
        requiresSsoLogin: true,
        message: 'Sign in with SSO Login before using this profile.',
      };
    }
    const expIso = s.accessTokenExpiresAt || row.expiresAt || undefined;
    const needsRefresh =
      expIso !== undefined &&
      Date.now() >= new Date(expIso).getTime() - SSO_ACCESS_REFRESH_SKEW_MS;
    if (!needsRefresh) {
      return { ok: true };
    }
    if (!s.refreshToken || !s.oidcClientId || s.oidcClientSecret === undefined) {
      return {
        ok: false,
        requiresSsoLogin: true,
        message: 'SSO session expired. Use SSO Login again.',
      };
    }
    const ssoRegion = row.ssoRegion || row.region || 'us-east-1';
    try {
      const refreshed = await refreshSsoAccessToken({
        ssoRegion,
        clientId: s.oidcClientId,
        clientSecret: s.oidcClientSecret,
        refreshToken: s.refreshToken,
      });
      await this.persistSsoRefreshAfterOidc(id, row, s, refreshed);
      return { ok: true };
    } catch {
      return {
        ok: false,
        requiresSsoLogin: true,
        message: 'SSO session expired. Use SSO Login again.',
      };
    }
  }

  private async materializeToAwsFiles(resolved: ResolvedAccount): Promise<void> {
    const row = resolved;
    if (row.authType === 'iam') {
      const s = resolved.secret as IamSecretPayload;
      await awsFiles.upsertProfileCredentials(row.profileName, s.accessKeyId, s.secretAccessKey);
      await awsFiles.upsertProfileConfig(
        row.profileName,
        row.region || 'us-east-1',
        row.output || 'json',
      );
      return;
    }
    const s = resolved.secret as SsoSecretPayload;
    const sessionName = row.ssoSessionName || `${row.profileName}-session`;
    await awsFiles.upsertSsoProfileConfig({
      profileName: row.profileName,
      ssoSessionName: sessionName,
      ssoAccountId: row.awsAccountId,
      ssoRoleName: row.roleName || row.profileName,
      ssoStartUrl: row.startUrl,
      ssoRegion: row.ssoRegion || row.region || 'us-east-1',
      region: row.region || 'us-east-1',
      output: row.output || 'json',
    });
    if (
      s.accessToken &&
      s.oidcClientId &&
      s.oidcClientSecret !== undefined &&
      row.startUrl &&
      (row.ssoRegion || row.region)
    ) {
      await awsFiles.writeSsoLoginCache({
        startUrl: row.startUrl,
        ssoSessionName: sessionName,
        region: row.ssoRegion || row.region || 'us-east-1',
        clientId: s.oidcClientId,
        clientSecret: s.oidcClientSecret,
        accessToken: s.accessToken,
        expiresAt: s.accessTokenExpiresAt || new Date(Date.now() + 3600_000).toISOString(),
        ...(s.refreshToken !== undefined ? { refreshToken: s.refreshToken } : {}),
        ...(s.oidcRegistrationExpiresAt !== undefined
          ? { registrationExpiresAt: s.oidcRegistrationExpiresAt }
          : {}),
      });
    }
  }

  async createIamAccount(input: CreateIamInput): Promise<string> {
    this.assertEncryption();
    if (this.repo().getByProfileName(input.profileName)) {
      throw new Error(`Profile "${input.profileName}" already exists`);
    }
    const id = randomUUID();
    const secretKey = randomUUID();
    const t = nowIso();
    const display = input.displayName?.trim() || input.profileName;

    const payload: IamSecretPayload = {
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
      sessionToken: null,
    };
    this.secret().saveSecret(secretKey, JSON.stringify(payload));

    let logoPath: string | null = null;
    if (input.logoPath) {
      try {
        logoPath = await copyLogoToStore(input.logoPath, input.profileName);
      } catch {
        logoPath = null;
      }
    }

    const row: AccountRow = {
      id,
      name: display,
      authType: 'iam',
      awsAccountId: '',
      profileName: input.profileName,
      roleName: '',
      region: input.region || 'us-east-1',
      output: input.output || 'json',
      startUrl: '',
      ssoRegion: '',
      ssoSessionName: '',
      secretKey,
      expiresAt: null,
      logoPath,
      createdAt: t,
      updatedAt: t,
    };
    this.repo().insertAccount(row);

    const resolved = this.getResolvedById(id);
    await this.materializeToAwsFiles(resolved);
    return id;
  }

  async createSsoAccount(input: CreateSsoInput): Promise<string> {
    this.assertEncryption();
    if (this.repo().getByProfileName(input.profileName)) {
      throw new Error(`Profile "${input.profileName}" already exists`);
    }
    const id = randomUUID();
    const secretKey = randomUUID();
    const t = nowIso();
    const display = input.displayName?.trim() || input.profileName;
    const sessionName = input.ssoSessionName?.trim() || `${input.profileName}-session`;

    this.secret().saveSecret(secretKey, JSON.stringify({} satisfies SsoSecretPayload));

    let logoPath: string | null = null;
    if (input.logoPath) {
      try {
        logoPath = await copyLogoToStore(input.logoPath, input.profileName);
      } catch {
        logoPath = null;
      }
    }

    const row: AccountRow = {
      id,
      name: display,
      authType: 'sso',
      awsAccountId: input.ssoAccountId,
      profileName: input.profileName,
      roleName: input.ssoRoleName,
      region: input.region || 'us-east-1',
      output: input.output || 'json',
      startUrl: input.ssoStartUrl,
      ssoRegion: input.ssoRegion || input.region || 'us-east-1',
      ssoSessionName: sessionName,
      secretKey,
      expiresAt: null,
      logoPath,
      createdAt: t,
      updatedAt: t,
    };
    this.repo().insertAccount(row);

    const resolved = this.getResolvedById(id);
    await this.materializeToAwsFiles(resolved);
    return id;
  }

  async updateIamAccount(id: string, input: UpdateIamInput): Promise<void> {
    this.assertEncryption();
    const row = this.repo().getById(id);
    if (row?.authType !== 'iam') {
      throw new Error('IAM account not found');
    }

    let logoPath: string | null = row.logoPath;
    if (input.logoPath !== undefined) {
      if (input.logoPath) {
        try {
          logoPath = await copyLogoToStore(input.logoPath, row.profileName);
        } catch {
          logoPath = row.logoPath;
        }
      } else {
        await removeStoredLogo(row.profileName);
        logoPath = null;
      }
    }

    const raw = this.secret().getSecret(row.secretKey);
    if (!raw) {
      throw new Error('Missing secret');
    }
    let payload = parseIamSecret(raw);
    if (input.accessKeyId) {
      payload = {
        ...payload,
        accessKeyId: input.accessKeyId,
      };
    }
    if (input.secretAccessKey && input.secretAccessKey.trim() !== '') {
      payload = {
        ...payload,
        secretAccessKey: input.secretAccessKey,
      };
    }
    this.secret().saveSecret(row.secretKey, JSON.stringify(payload));

    const nextName =
      input.displayName !== undefined
        ? input.displayName.trim() || row.profileName
        : row.name;
    this.repo().updateAccount(id, {
      name: nextName,
      region: input.region,
      output: input.output,
      logoPath,
    });

    const resolved = this.getResolvedById(id);
    await this.materializeToAwsFiles(resolved);
  }

  async updateSsoAccount(id: string, input: UpdateSsoInput): Promise<void> {
    this.assertEncryption();
    const row = this.repo().getById(id);
    if (row?.authType !== 'sso') {
      throw new Error('SSO account not found');
    }

    let logoPath: string | null = row.logoPath;
    if (input.logoPath !== undefined) {
      if (input.logoPath) {
        try {
          logoPath = await copyLogoToStore(input.logoPath, row.profileName);
        } catch {
          logoPath = row.logoPath;
        }
      } else {
        await removeStoredLogo(row.profileName);
        logoPath = null;
      }
    }

    const sessionName = input.ssoSessionName?.trim() || row.ssoSessionName || `${row.profileName}-session`;

    const nextName =
      input.displayName !== undefined
        ? input.displayName.trim() || row.profileName
        : row.name;
    this.repo().updateAccount(id, {
      name: nextName,
      awsAccountId: input.ssoAccountId,
      roleName: input.ssoRoleName,
      region: input.region,
      output: input.output,
      startUrl: input.ssoStartUrl,
      ssoRegion: input.ssoRegion || input.region,
      ssoSessionName: sessionName,
      logoPath,
    });

    const resolved = this.getResolvedById(id);
    await this.materializeToAwsFiles(resolved);
  }

  async deleteAccount(id: string): Promise<void> {
    const row = this.repo().getById(id);
    if (!row) {
      return;
    }
    await awsFiles.deleteProfile(row.profileName);
    await removeStoredLogo(row.profileName);
    const sk = row.secretKey;
    if (this.repo().getActiveAccountId() === id) {
      this.repo().setActiveAccountId(null);
    }
    this.repo().deleteAccount(id);
    this.secret().deleteSecret(sk);
  }

  async switchAccount(id: string): Promise<{
    verified: boolean;
    identity?: { account: string; arn: string; userId?: string };
    error?: string;
    requiresSsoLogin?: boolean;
  }> {
    const row = this.repo().getById(id);
    if (!row) {
      return { verified: false, error: 'Account not found' };
    }
    if (row.authType === 'sso') {
      const gate = await this.ensureSsoOidcSessionUsable(id);
      if (!gate.ok) {
        return {
          verified: false,
          error: gate.message,
          requiresSsoLogin: true,
        };
      }
    }
    try {
      const resolved = this.getResolvedById(id);
      await this.materializeToAwsFiles(resolved);
      await awsFiles.setDefaultFromProfile(row.profileName);
      this.repo().setActiveAccountId(id);
      try {
        const identity = await this.verifyAccountIdentity(id);
        return { verified: true, identity };
      } catch {
        return { verified: false };
      }
    } catch (e: unknown) {
      return { verified: false, error: (e as Error).message };
    }
  }

  async verifyAccountIdentity(
    id: string,
  ): Promise<{ account: string; arn: string; userId?: string }> {
    let resolved = this.getResolvedById(id);
    try {
      return await getCallerIdentityForResolvedAccount(resolved);
    } catch (e: unknown) {
      if (resolved.authType !== 'sso' || !isUnauthorized(e)) {
        throw e;
      }
      const row = this.repo().getById(id)!;
      const s = resolved.secret as SsoSecretPayload;
      if (!s.refreshToken || !s.oidcClientId || s.oidcClientSecret === undefined) {
        throw e;
      }
      const ssoRegion = row.ssoRegion || row.region || 'us-east-1';
      const refreshed = await refreshSsoAccessToken({
        ssoRegion,
        clientId: s.oidcClientId,
        clientSecret: s.oidcClientSecret,
        refreshToken: s.refreshToken,
      });
      await this.persistSsoRefreshAfterOidc(id, row, s, refreshed);
      resolved = this.getResolvedById(id);
      return getCallerIdentityForResolvedAccount(resolved);
    }
  }

  async ssoLogin(
    id: string,
    hooks?: {
      onDeviceAuthorizationStarted?: (info: SsoDeviceAuthorizationStarted) => void;
    },
  ): Promise<{ accessExpiryUnchanged: boolean }> {
    this.assertEncryption();
    const row = this.repo().getById(id);
    if (row?.authType !== 'sso') {
      throw new Error('SSO account not found');
    }
    if (!row.startUrl || !row.ssoRegion) {
      throw new Error('SSO start URL and region are required');
    }
    const raw = this.secret().getSecret(row.secretKey);
    const existing = raw ? parseSsoSecret(raw) : {};
    const priorExpiryMs =
      existing.accessTokenExpiresAt != null &&
      existing.accessTokenExpiresAt !== '' &&
      !Number.isNaN(Date.parse(existing.accessTokenExpiresAt))
        ? Date.parse(existing.accessTokenExpiresAt)
        : 0;
    const ssoRegion = row.ssoRegion || row.region || 'us-east-1';
    const { clientId, clientSecret, registrationExpiresAt } = await ensureOidcRegistration(
      ssoRegion,
      {
        ...(existing.oidcClientId !== undefined ? { oidcClientId: existing.oidcClientId } : {}),
        ...(existing.oidcClientSecret !== undefined
          ? { oidcClientSecret: existing.oidcClientSecret }
          : {}),
        ...(existing.oidcRegistrationExpiresAt !== undefined
          ? { oidcRegistrationExpiresAt: existing.oidcRegistrationExpiresAt }
          : {}),
      },
    );

    let secretPayload: SsoSecretPayload = {
      ...existing,
      oidcClientId: clientId,
      oidcClientSecret: clientSecret,
    };
    if (registrationExpiresAt !== undefined) {
      secretPayload = { ...secretPayload, oidcRegistrationExpiresAt: registrationExpiresAt };
    }
    this.saveSsoSecret(row, secretPayload);

    const tokens = await pollSsoDeviceAuthorization({
      ssoRegion,
      clientId,
      clientSecret,
      startUrl: row.startUrl,
      openUrl: (url) => {
        void shell.openExternal(url);
      },
      ...(hooks?.onDeviceAuthorizationStarted !== undefined
        ? { onDeviceAuthorizationStarted: hooks.onDeviceAuthorizationStarted }
        : {}),
    });

    const expiresAtIso =
      tokens.expiresAt && !Number.isNaN(Date.parse(tokens.expiresAt))
        ? tokens.expiresAt
        : new Date(Date.now() + 3600_000).toISOString();

    const newExpiryMs = Date.parse(expiresAtIso);
    const accessExpiryUnchanged =
      priorExpiryMs > 0 && Math.abs(newExpiryMs - priorExpiryMs) <= 60_000;

    secretPayload = {
      ...secretPayload,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: expiresAtIso,
      ...(tokens.refreshToken !== undefined ? { refreshToken: tokens.refreshToken } : {}),
    };
    this.saveSsoSecret(row, secretPayload);
    this.repo().updateAccount(id, { expiresAt: expiresAtIso });

    const resolved = this.getResolvedById(id);
    await this.materializeToAwsFiles(resolved);
    if (this.repo().getActiveAccountId() === id) {
      await awsFiles.setDefaultFromProfile(row.profileName);
    }

    return { accessExpiryUnchanged };
  }
}

let serviceSingleton: AccountService | null = null;

export function getAccountService(): AccountService {
  if (!serviceSingleton) {
    serviceSingleton = new AccountService();
  }
  return serviceSingleton;
}
