export type AuthType = "iam" | "sso";

/** Payload from main when IAM Identity Center device authorization starts (before browser opens). */
export interface SsoDeviceAuthorizationEvent {
  accountId: string;
  userCode: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  expiresIn?: number;
}

export interface Account {
  id: string;
  name: string;
  profileName: string;
  authType: AuthType;
  region?: string;
  output?: string;
  logoPath?: string;
  startUrl?: string;
  awsAccountId?: string;
  roleName?: string;
  ssoRegion?: string;
  ssoSessionName?: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountFormData {
  id?: string;
  profileName: string;
  authType: AuthType;
  accessKeyId: string;
  secretAccessKey: string;
  ssoStartUrl?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  ssoRegion?: string;
  ssoSessionName?: string;
  region: string;
  output: string;
  logoPath?: string;
  displayName?: string;
}
