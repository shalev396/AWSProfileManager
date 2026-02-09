export interface Account {
  profileName: string;
  displayName?: string;
  logoPath?: string;
  region?: string;
  output?: string;
}

export interface AppData {
  activeProfile: string | null;
  accounts: Account[];
}

export interface AccountFormData {
  profileName: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  output: string;
  logoPath?: string;
  displayName?: string;
}
