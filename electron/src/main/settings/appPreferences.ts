import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getUserDataRoot } from '../bootstrap/appPaths';

const PREF_FILE = 'app-preferences.json';

export interface AppPreferencesFile {
  /** Last user choice; used when app is not packaged (dev). */
  openAtLogin: boolean;
  /** Native dialog for start-at-login was shown (or skipped in dev). */
  openAtLoginPromptCompleted: boolean;
}

const defaultPrefs: AppPreferencesFile = {
  openAtLogin: false,
  openAtLoginPromptCompleted: false,
};

function preferencesPath(): string {
  return path.join(getUserDataRoot(), PREF_FILE);
}

export function loadAppPreferences(): AppPreferencesFile {
  try {
    const raw = fs.readFileSync(preferencesPath(), 'utf8');
    const o = JSON.parse(raw) as Partial<AppPreferencesFile>;
    return {
      openAtLogin: typeof o.openAtLogin === 'boolean' ? o.openAtLogin : defaultPrefs.openAtLogin,
      openAtLoginPromptCompleted:
        typeof o.openAtLoginPromptCompleted === 'boolean'
          ? o.openAtLoginPromptCompleted
          : defaultPrefs.openAtLoginPromptCompleted,
    };
  } catch {
    return { ...defaultPrefs };
  }
}

export function saveAppPreferences(partial: Partial<AppPreferencesFile>): AppPreferencesFile {
  const next = { ...loadAppPreferences(), ...partial };
  fs.mkdirSync(getUserDataRoot(), { recursive: true });
  fs.writeFileSync(preferencesPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** Whether OS login-item APIs target this installed app (not the dev Electron binary). */
export function canApplyOpenAtLoginToOs(): boolean {
  return app.isPackaged;
}

/**
 * Apply start-at-login via the OS. Tray-style: start hidden where supported.
 */
export function applyOpenAtLoginToOs(enabled: boolean): void {
  if (!app.isPackaged) {return;}
  const hiddenSupported = process.platform === 'darwin' || process.platform === 'win32';
  app.setLoginItemSettings({
    openAtLogin: enabled,
    ...(hiddenSupported ? { openAsHidden: true } : {}),
  });
}

export function getOpenAtLoginFromOs(): boolean {
  if (!app.isPackaged) {return false;}
  return app.getLoginItemSettings().openAtLogin;
}

export function getOpenAtLoginForUi(): boolean {
  if (app.isPackaged) {
    return getOpenAtLoginFromOs();
  }
  return loadAppPreferences().openAtLogin;
}

export function setOpenAtLogin(enabled: boolean): void {
  saveAppPreferences({ openAtLogin: enabled });
  applyOpenAtLoginToOs(enabled);
}
