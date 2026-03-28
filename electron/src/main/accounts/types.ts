export type AuthType = 'iam' | 'sso';

export interface IamSecretPayload {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string | null;
}

export interface SsoSecretPayload {
  oidcClientId?: string;
  oidcClientSecret?: string;
  /** ISO time; mirrors CLI cache `registrationExpiresAt` (OIDC client registration expiry). */
  oidcRegistrationExpiresAt?: string;
  refreshToken?: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
}

/** Mirrors DB row: unused SSO columns are empty string for IAM accounts. */
export interface AccountRow {
  id: string;
  name: string;
  authType: AuthType;
  awsAccountId: string;
  profileName: string;
  roleName: string;
  region: string;
  output: string;
  startUrl: string;
  ssoRegion: string;
  ssoSessionName: string;
  secretKey: string;
  expiresAt: string | null;
  logoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned to renderer — no secret fields */
export interface AccountSummary {
  id: string;
  name: string;
  authType: AuthType;
  awsAccountId?: string;
  profileName: string;
  roleName?: string;
  region?: string;
  output?: string;
  startUrl?: string;
  ssoRegion?: string;
  ssoSessionName?: string;
  expiresAt?: string | null;
  logoPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedAccount extends AccountRow {
  secret: IamSecretPayload | SsoSecretPayload;
}

/** Edit form: IAM access key id only; SSO fields from row */
export interface AccountEditPublic {
  accessKeyId?: string;
  ssoSessionName?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  ssoStartUrl?: string;
  ssoRegion?: string;
  region?: string;
  output?: string;
}
