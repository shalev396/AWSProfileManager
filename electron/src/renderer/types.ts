export type AuthType = 'access-key' | 'sso';

export interface Account {
  profileName: string;
  authType: AuthType;
  displayName?: string;
  logoPath?: string;
  region?: string;
  output?: string;
  ssoStartUrl?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  ssoRegion?: string;
  ssoSessionName?: string;
}

export interface AppData {
  activeProfile: string | null;
  accounts: Account[];
}

export interface AccountFormData {
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
