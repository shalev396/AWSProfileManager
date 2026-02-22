import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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

let cachedAppData: AppData | null = null;

/**
 * Resolves app data directory using OS/env only (no hardcoded "Users" etc.),
 * so localized Windows (e.g. Hebrew "משתמשים") and other locales work correctly.
 */
export function getAppDataPath(): string {
  const platform = os.platform();
  let appDataDir: string;

  if (platform === 'darwin') {
    appDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'aws-profile-manager');
  } else if (platform === 'win32') {
    // Use APPDATA/USERPROFILE so we never rely on folder names like "Users" (localized names differ).
    const appDataBase =
      process.env.APPDATA ||
      (process.env.USERPROFILE
        ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming')
        : path.join(os.homedir(), 'AppData', 'Roaming'));
    appDataDir = path.join(appDataBase, 'aws-profile-manager');
  } else {
    // Linux and others
    appDataDir = path.join(os.homedir(), '.config', 'aws-profile-manager');
  }

  return path.join(appDataDir, 'accounts.json');
}

export function getAppDataDir(): string {
  return path.dirname(getAppDataPath());
}

export function getLogosDir(): string {
  return path.join(getAppDataDir(), 'logos');
}

async function ensureLogosDir(): Promise<void> {
  await fs.mkdir(getLogosDir(), { recursive: true });
}

/** Copy a logo file into app-owned storage so it survives e.g. Downloads being cleared. Returns the stored path. */
export async function copyLogoToStore(sourcePath: string, profileName: string): Promise<string> {
  const logosDir = getLogosDir();
  const normalizedSource = path.normalize(sourcePath);
  const normalizedLogos = path.normalize(logosDir);
  if (normalizedSource.startsWith(normalizedLogos)) {
    return sourcePath;
  }
  await ensureLogosDir();
  const ext = path.extname(sourcePath) || '.png';
  const safeName = profileName.replace(/[^a-zA-Z0-9\-_]/g, '_');
  const destPath = path.join(logosDir, `${safeName}${ext}`);
  await fs.copyFile(sourcePath, destPath);
  return destPath;
}

/** Remove stored logo file(s) for a profile when logo is cleared or account is deleted. */
export async function removeStoredLogo(profileName: string): Promise<void> {
  const logosDir = getLogosDir();
  const safeName = profileName.replace(/[^a-zA-Z0-9\-_]/g, '_');
  try {
    const entries = await fs.readdir(logosDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.startsWith(safeName + '.')) {
        await fs.unlink(path.join(logosDir, e.name));
      }
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function ensureAppDataDir(): Promise<void> {
  const appDataPath = getAppDataPath();
  const dir = path.dirname(appDataPath);
  await fs.mkdir(dir, { recursive: true });
}

export async function loadAccounts(): Promise<AppData> {
  if (cachedAppData) {
    return cachedAppData;
  }
  
  const appDataPath = getAppDataPath();
  
  try {
    const content = await fs.readFile(appDataPath, 'utf-8');
    cachedAppData = JSON.parse(content);

    // Migration: default authType to 'access-key' for existing profiles
    let migrated = false;
    for (const account of cachedAppData!.accounts) {
      if (!account.authType) {
        account.authType = 'access-key';
        migrated = true;
      }
    }
    if (migrated) {
      await saveAccounts(cachedAppData!);
    }

    return cachedAppData!;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default
      cachedAppData = {
        activeProfile: null,
        accounts: []
      };
      return cachedAppData;
    }
    throw error;
  }
}

export async function saveAccounts(data: AppData): Promise<void> {
  await ensureAppDataDir();
  const appDataPath = getAppDataPath();
  const tempPath = `${appDataPath}.tmp`;
  
  try {
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, appDataPath);
    cachedAppData = data;
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

export async function addAccount(account: Account): Promise<void> {
  const data = await loadAccounts();
  
  // Check if profile already exists
  const existingIndex = data.accounts.findIndex(a => a.profileName === account.profileName);
  if (existingIndex >= 0) {
    throw new Error(`Profile "${account.profileName}" already exists`);
  }
  
  data.accounts.push(account);
  await saveAccounts(data);
}

export async function updateAccount(profileName: string, updates: Partial<Account>): Promise<void> {
  const data = await loadAccounts();
  const index = data.accounts.findIndex(a => a.profileName === profileName);
  
  if (index === -1) {
    throw new Error(`Profile "${profileName}" not found`);
  }
  
  data.accounts[index] = { ...data.accounts[index], ...updates };
  await saveAccounts(data);
}

export async function removeAccount(profileName: string): Promise<void> {
  const data = await loadAccounts();
  data.accounts = data.accounts.filter(a => a.profileName !== profileName);
  
  // Clear active profile if it was the one being removed
  if (data.activeProfile === profileName) {
    data.activeProfile = null;
  }
  
  await saveAccounts(data);
}

export async function setActiveProfile(profileName: string | null): Promise<void> {
  const data = await loadAccounts();
  data.activeProfile = profileName;
  await saveAccounts(data);
}

export async function getActiveProfile(): Promise<string | null> {
  const data = await loadAccounts();
  return data.activeProfile;
}

export function clearCache(): void {
  cachedAppData = null;
}
