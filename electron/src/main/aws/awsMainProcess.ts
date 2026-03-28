import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { SSOClient, GetRoleCredentialsCommand } from '@aws-sdk/client-sso';
import {
  SSOOIDCClient,
  RegisterClientCommand,
  StartDeviceAuthorizationCommand,
  CreateTokenCommand,
} from '@aws-sdk/client-sso-oidc';
import type { ResolvedAccount, IamSecretPayload, SsoSecretPayload } from '../accounts/types';

export async function ensureOidcRegistration(
  ssoRegion: string,
  existing?: {
    oidcClientId?: string;
    oidcClientSecret?: string;
    oidcRegistrationExpiresAt?: string;
  },
): Promise<{ clientId: string; clientSecret: string; registrationExpiresAt?: string }> {
  if (existing?.oidcClientId && existing?.oidcClientSecret !== undefined) {
    return {
      clientId: existing.oidcClientId,
      clientSecret: existing.oidcClientSecret,
      ...(existing.oidcRegistrationExpiresAt !== undefined
        ? { registrationExpiresAt: existing.oidcRegistrationExpiresAt }
        : {}),
    };
  }
  const client = new SSOOIDCClient({ region: ssoRegion });
  const reg = await client.send(
    new RegisterClientCommand({
      clientName: 'AWS Profile Manager',
      clientType: 'public',
    }),
  );
  if (!reg.clientId) {
    throw new Error('SSO RegisterClient did not return clientId');
  }
  const registrationExpiresAt =
    typeof reg.clientSecretExpiresAt === 'number' && Number.isFinite(reg.clientSecretExpiresAt)
      ? new Date(reg.clientSecretExpiresAt * 1000).toISOString()
      : undefined;
  return {
    clientId: reg.clientId,
    clientSecret: reg.clientSecret ?? '',
    ...(registrationExpiresAt !== undefined ? { registrationExpiresAt } : {}),
  };
}

export interface SsoDeviceAuthorizationStarted {
  userCode: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  expiresIn?: number;
}

/** When CreateToken omits or mis-sends `expiresIn`, JSON would otherwise drop `accessTokenExpiresAt` and leave stale UI. */
const DEFAULT_OIDC_ACCESS_TTL_SEC = 3600;
/** Access tokens are short-lived; larger values are treated as Unix expiry seconds (defensive). */
const MAX_PLAUSIBLE_ACCESS_TTL_SEC = 86400 * 7;

function parseExpiresInSeconds(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return undefined;
}

/**
 * Decode JWT `exp` (seconds since epoch) when the access token is a JWT.
 * IAM Identity Center often returns JWT access tokens; `exp` is authoritative for wall-clock expiry.
 */
function tryJwtExpIso(accessToken: string): string | undefined {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    return undefined;
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
      exp?: unknown;
    };
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      return new Date(payload.exp * 1000).toISOString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * AWS CreateToken `expiresIn`: documented as integer; in practice this is the access-token lifetime
 * (same idea as OAuth `expires_in`). Very large values are treated as Unix expiry seconds.
 * @see https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/API_CreateToken.html
 */
export function expiresAtFromCreateTokenResponse(token: { expiresIn?: unknown }): string {
  const sec = parseExpiresInSeconds(token.expiresIn);
  if (sec === undefined) {
    return new Date(Date.now() + DEFAULT_OIDC_ACCESS_TTL_SEC * 1000).toISOString();
  }
  if (sec > MAX_PLAUSIBLE_ACCESS_TTL_SEC) {
    return new Date(sec * 1000).toISOString();
  }
  return new Date(Date.now() + sec * 1000).toISOString();
}

/** Prefer JWT `exp` when present so re-login always reflects the new token's clock. */
export function accessTokenExpiryIso(accessToken: string, token: { expiresIn?: unknown }): string {
  return tryJwtExpIso(accessToken) ?? expiresAtFromCreateTokenResponse(token);
}

export async function pollSsoDeviceAuthorization(params: {
  ssoRegion: string;
  clientId: string;
  clientSecret: string;
  startUrl: string;
  openUrl: (url: string) => void;
  onDeviceAuthorizationStarted?: (info: SsoDeviceAuthorizationStarted) => void;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}> {
  const client = new SSOOIDCClient({ region: params.ssoRegion });
  const start = await client.send(
    new StartDeviceAuthorizationCommand({
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      startUrl: params.startUrl,
    }),
  );
  if (!start.userCode || !start.deviceCode) {
    throw new Error('SSO StartDeviceAuthorization did not return userCode or deviceCode');
  }
  params.onDeviceAuthorizationStarted?.({
    userCode: start.userCode,
    ...(start.verificationUri !== undefined ? { verificationUri: start.verificationUri } : {}),
    ...(start.verificationUriComplete !== undefined
      ? { verificationUriComplete: start.verificationUriComplete }
      : {}),
    ...(start.expiresIn !== undefined ? { expiresIn: start.expiresIn } : {}),
  });
  if (start.verificationUriComplete) {
    params.openUrl(start.verificationUriComplete);
  } else if (start.verificationUri) {
    params.openUrl(start.verificationUri);
  }
  const intervalMs = (start.interval ?? 5) * 1000;
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    try {
      const token = await client.send(
        new CreateTokenCommand({
          clientId: params.clientId,
          clientSecret: params.clientSecret,
          deviceCode: start.deviceCode,
          grantType: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      );
      if (!token.accessToken) {
        throw new Error('SSO token response missing accessToken');
      }
      const expiresAt = accessTokenExpiryIso(token.accessToken, token);
      return {
        accessToken: token.accessToken,
        expiresAt,
        ...(token.refreshToken !== undefined ? { refreshToken: token.refreshToken } : {}),
      };
    } catch (e: unknown) {
      const name = (e as { name?: string }).name;
      if (name === 'AuthorizationPendingException') {
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      if (name === 'SlowDownException') {
        await new Promise((r) => setTimeout(r, intervalMs + 2000));
        continue;
      }
      if (name === 'ExpiredTokenException') {
        throw new Error('Device authorization expired; try SSO Login again.');
      }
      throw e;
    }
  }
  throw new Error('SSO login timed out waiting for browser authorization.');
}

export async function refreshSsoAccessToken(params: {
  ssoRegion: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresAt: string }> {
  const client = new SSOOIDCClient({ region: params.ssoRegion });
  const token = await client.send(
    new CreateTokenCommand({
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      grantType: 'refresh_token',
      refreshToken: params.refreshToken,
    }),
  );
  if (!token.accessToken) {
    throw new Error('SSO refresh did not return accessToken');
  }
  const expiresAt = accessTokenExpiryIso(token.accessToken, token);
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? params.refreshToken,
    expiresAt,
  };
}

export async function getCallerIdentityForResolvedAccount(
  resolved: ResolvedAccount,
): Promise<{ account: string; arn: string; userId?: string }> {
  if (resolved.authType === 'iam') {
    const s = resolved.secret as IamSecretPayload;
    const sts = new STSClient({
      region: resolved.region || 'us-east-1',
      credentials: {
        accessKeyId: s.accessKeyId,
        secretAccessKey: s.secretAccessKey,
        ...(s.sessionToken != null && s.sessionToken !== ''
          ? { sessionToken: s.sessionToken }
          : {}),
      },
    });
    const out = await sts.send(new GetCallerIdentityCommand({}));
    return {
      account: out.Account!,
      arn: out.Arn!,
      ...(out.UserId !== undefined ? { userId: out.UserId } : {}),
    };
  }

  const s = resolved.secret as SsoSecretPayload;
  const accessToken = s.accessToken;
  if (!accessToken) {
    throw new Error('Not logged in via SSO; use SSO Login.');
  }
  const ssoRegion = resolved.ssoRegion || resolved.region || 'us-east-1';
  const accountId = resolved.awsAccountId;
  const roleName = resolved.roleName || resolved.profileName;
  if (!accountId || !roleName) {
    throw new Error('SSO account id and role name are required.');
  }

  const sso = new SSOClient({ region: ssoRegion });
  const creds = await sso.send(
    new GetRoleCredentialsCommand({
      accountId,
      roleName,
      accessToken,
    }),
  );
  const rc = creds.roleCredentials;
  if (!rc?.accessKeyId || !rc?.secretAccessKey) {
    throw new Error('Failed to get SSO role credentials.');
  }
  const sts = new STSClient({
    region: resolved.region || 'us-east-1',
    credentials: {
      accessKeyId: rc.accessKeyId,
      secretAccessKey: rc.secretAccessKey,
      ...(rc.sessionToken != null && rc.sessionToken !== ''
        ? { sessionToken: rc.sessionToken }
        : {}),
    },
  });
  const out = await sts.send(new GetCallerIdentityCommand({}));
  return {
    account: out.Account!,
    arn: out.Arn!,
    ...(out.UserId !== undefined ? { userId: out.UserId } : {}),
  };
}
