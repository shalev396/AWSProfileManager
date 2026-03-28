import { app, ipcMain, dialog, BrowserWindow, shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as awsFiles from '../awsFiles';
import { getUserDataRoot, getLogosDir } from '../bootstrap/appPaths';
import { getAccountService } from '../accounts/accountService';
import { isEncryptionAvailable, encryptionDebugInfo } from '../security/secretService';
import {
  canApplyOpenAtLoginToOs,
  getOpenAtLoginForUi,
  setOpenAtLogin,
} from '../settings/appPreferences';
import { getAssetsDir } from '../appIcon';
import type { SsoDeviceAuthorizationStarted } from '../aws/awsMainProcess';

let mainWindowRef: BrowserWindow | null = null;
let trayUpdateCallback: (() => void) | null = null;
let handlersRegistered = false;

export function setTrayUpdateCallback(callback: () => void): void {
  trayUpdateCallback = callback;
}

export function notifyRendererStateChanged(): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('app:stateChanged');
  }
}

function validateProfileName(profileName: string): void {
  if (!profileName || !/^[a-zA-Z0-9-_]+$/.test(profileName)) {
    throw new Error('Profile name must contain only letters, numbers, hyphens, and underscores');
  }
}

function validateAccessKey(accessKeyId: string): void {
  if (!accessKeyId || accessKeyId.length < 16) {
    throw new Error('Invalid access key ID');
  }
}

function validateSecretKey(secretAccessKey: string): void {
  if (!secretAccessKey || secretAccessKey.length < 40) {
    throw new Error('Invalid secret access key (must be at least 40 characters)');
  }
}

export function setupIpcHandlers(mainWindow: BrowserWindow | null): void {
  mainWindowRef = mainWindow;

  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  ipcMain.handle('dialog:selectImage', async () => {
    const parentWindow = mainWindow ?? BrowserWindow.getFocusedWindow();
    if (!parentWindow) {
      return { canceled: true };
    }
    const result = await dialog.showOpenDialog(parentWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, filePath: result.filePaths[0] };
  });

  ipcMain.handle('app:getDataPaths', async () => {
    const awsPaths = awsFiles.getAwsPaths();
    return {
      appDataDir: getUserDataRoot(),
      logosDir: getLogosDir(),
      awsCredentials: awsPaths.credentials,
      awsConfig: awsPaths.config,
    };
  });

  ipcMain.handle('app:openDataFolder', async () => {
    await shell.openPath(getUserDataRoot());
  });

  ipcMain.handle('app:getAppVersion', async () => ({ version: app.getVersion() }));

  ipcMain.handle('app:getAppIconDataUrl', async () => {
    const dir = getAssetsDir();
    const names: { file: string; mime: string }[] = [
      { file: 'icon.png', mime: 'image/png' },
      { file: 'icon.ico', mime: 'image/x-icon' },
      { file: 'icon.svg', mime: 'image/svg+xml' },
    ];
    for (const { file, mime } of names) {
      const full = path.join(dir, file);
      try {
        await fs.access(full);
        const buf = await fs.readFile(full);
        return `data:${mime};base64,${buf.toString('base64')}`;
      } catch {
        /* try next */
      }
    }
    return null;
  });

  ipcMain.handle('app:getLogoDataUrl', async (_event, logoPath: string) => {
    if (!logoPath) {return null;}
    try {
      await fs.access(logoPath);
      const buf = await fs.readFile(logoPath);
      const ext = path.extname(logoPath).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.webp'
                ? 'image/webp'
                : 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('app:getEncryptionStatus', async () => {
    return {
      available: isEncryptionAvailable(),
      debug: encryptionDebugInfo(),
    };
  });

  ipcMain.handle('app:getLaunchAtLogin', async () => {
    return {
      openAtLogin: getOpenAtLoginForUi(),
      osControlsApply: canApplyOpenAtLoginToOs(),
    };
  });

  ipcMain.handle('app:setLaunchAtLogin', async (_event, enabled: boolean) => {
    setOpenAtLogin(!!enabled);
    return { success: true as const };
  });

  ipcMain.handle('accounts:list', async () => {
    try {
      const svc = getAccountService();
      const data = svc.listSummaries();
      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('accounts:getActive', async () => {
    try {
      const id = getAccountService().getActiveAccountId();
      return { success: true, data: id };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('accounts:getForEdit', async (_event, accountId: string) => {
    try {
      const svc = getAccountService();
      const { summary, accessKeyId } = svc.getPublicEditFields(accountId);
      return { success: true, data: { summary, accessKeyId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('profiles:listFromAws', async () => {
    try {
      const profiles = await awsFiles.listProfiles();
      return { success: true, data: profiles };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(
    'accounts:createIam',
    async (
      _event,
      accountData: {
        profileName: string;
        displayName?: string;
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        output: string;
        logoPath?: string;
      },
    ) => {
      try {
        getAccountService().assertEncryption();
        validateProfileName(accountData.profileName);
        validateAccessKey(accountData.accessKeyId);
        validateSecretKey(accountData.secretAccessKey);
        const id = await getAccountService().createIamAccount({
          profileName: accountData.profileName,
          accessKeyId: accountData.accessKeyId,
          secretAccessKey: accountData.secretAccessKey,
          region: accountData.region || 'us-east-1',
          output: accountData.output || 'json',
          ...(accountData.displayName !== undefined
            ? { displayName: accountData.displayName }
            : {}),
          ...(accountData.logoPath !== undefined ? { logoPath: accountData.logoPath } : {}),
        });
        trayUpdateCallback?.();
        notifyRendererStateChanged();
        return { success: true, data: { id } };
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle(
    'accounts:createSso',
    async (
      _event,
      accountData: {
        profileName: string;
        displayName?: string;
        ssoStartUrl: string;
        ssoAccountId: string;
        ssoRoleName: string;
        ssoRegion?: string;
        ssoSessionName?: string;
        region: string;
        output: string;
        logoPath?: string;
      },
    ) => {
      try {
        getAccountService().assertEncryption();
        validateProfileName(accountData.profileName);
        if (!accountData.ssoStartUrl || !accountData.ssoAccountId || !accountData.ssoRoleName) {
          throw new Error('SSO Start URL, Account ID, and Role Name are required');
        }
        const id = await getAccountService().createSsoAccount({
          profileName: accountData.profileName,
          ssoStartUrl: accountData.ssoStartUrl,
          ssoAccountId: accountData.ssoAccountId,
          ssoRoleName: accountData.ssoRoleName,
          ssoRegion: accountData.ssoRegion || accountData.region || 'us-east-1',
          region: accountData.region || 'us-east-1',
          output: accountData.output || 'json',
          ...(accountData.displayName !== undefined
            ? { displayName: accountData.displayName }
            : {}),
          ...(accountData.ssoSessionName !== undefined
            ? { ssoSessionName: accountData.ssoSessionName }
            : {}),
          ...(accountData.logoPath !== undefined ? { logoPath: accountData.logoPath } : {}),
        });
        trayUpdateCallback?.();
        notifyRendererStateChanged();
        return { success: true, data: { id } };
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle(
    'accounts:updateIam',
    async (
      _event,
      payload: {
        id: string;
        displayName?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        region: string;
        output: string;
        logoPath?: string;
      },
    ) => {
      try {
        getAccountService().assertEncryption();
        if (payload.accessKeyId) {
          validateAccessKey(payload.accessKeyId);
        }
        if (payload.secretAccessKey && payload.secretAccessKey.trim() !== '') {
          validateSecretKey(payload.secretAccessKey);
        }
        await getAccountService().updateIamAccount(payload.id, {
          region: payload.region || 'us-east-1',
          output: payload.output || 'json',
          ...(payload.displayName !== undefined ? { displayName: payload.displayName } : {}),
          ...(payload.accessKeyId !== undefined ? { accessKeyId: payload.accessKeyId } : {}),
          ...(payload.secretAccessKey !== undefined
            ? { secretAccessKey: payload.secretAccessKey }
            : {}),
          ...(payload.logoPath !== undefined ? { logoPath: payload.logoPath } : {}),
        });
        trayUpdateCallback?.();
        notifyRendererStateChanged();
        return { success: true };
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle(
    'accounts:updateSso',
    async (
      _event,
      payload: {
        id: string;
        displayName?: string;
        ssoStartUrl: string;
        ssoAccountId: string;
        ssoRoleName: string;
        ssoRegion?: string;
        ssoSessionName?: string;
        region: string;
        output: string;
        logoPath?: string;
      },
    ) => {
      try {
        getAccountService().assertEncryption();
        if (!payload.ssoStartUrl || !payload.ssoAccountId || !payload.ssoRoleName) {
          throw new Error('SSO Start URL, Account ID, and Role Name are required');
        }
        await getAccountService().updateSsoAccount(payload.id, {
          ssoStartUrl: payload.ssoStartUrl,
          ssoAccountId: payload.ssoAccountId,
          ssoRoleName: payload.ssoRoleName,
          ssoRegion: payload.ssoRegion || payload.region || 'us-east-1',
          region: payload.region || 'us-east-1',
          output: payload.output || 'json',
          ...(payload.displayName !== undefined ? { displayName: payload.displayName } : {}),
          ...(payload.ssoSessionName !== undefined
            ? { ssoSessionName: payload.ssoSessionName }
            : {}),
          ...(payload.logoPath !== undefined ? { logoPath: payload.logoPath } : {}),
        });
        trayUpdateCallback?.();
        notifyRendererStateChanged();
        return { success: true };
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle('accounts:delete', async (_event, accountId: string) => {
    try {
      await getAccountService().deleteAccount(accountId);
      trayUpdateCallback?.();
      notifyRendererStateChanged();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('accounts:switch', async (_event, accountId: string) => {
    try {
      getAccountService().assertEncryption();
      const result = await getAccountService().switchAccount(accountId);
      trayUpdateCallback?.();
      notifyRendererStateChanged();
      if (result.error) {
        return {
          success: false,
          error: result.error,
          ...(result.requiresSsoLogin ? { requiresSsoLogin: true as const } : {}),
        };
      }
      return {
        success: true,
        verified: result.verified,
        identity: result.identity,
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('accounts:verify', async (_event, accountId: string) => {
    try {
      getAccountService().assertEncryption();
      const identity = await getAccountService().verifyAccountIdentity(accountId);
      return { success: true, identity };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message || 'Failed to verify credentials' };
    }
  });

  ipcMain.handle('accounts:ssoLogin', async (event, accountId: string) => {
    try {
      getAccountService().assertEncryption();
      const { accessExpiryUnchanged } = await getAccountService().ssoLogin(accountId, {
        onDeviceAuthorizationStarted: (info: SsoDeviceAuthorizationStarted) => {
          event.sender.send('accounts:ssoDeviceAuthorization', {
            accountId,
            userCode: info.userCode,
            ...(info.verificationUri !== undefined ? { verificationUri: info.verificationUri } : {}),
            ...(info.verificationUriComplete !== undefined
              ? { verificationUriComplete: info.verificationUriComplete }
              : {}),
            ...(info.expiresIn !== undefined ? { expiresIn: info.expiresIn } : {}),
          });
        },
      });
      trayUpdateCallback?.();
      notifyRendererStateChanged();
      return { success: true, accessExpiryUnchanged };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message || 'SSO login failed' };
    }
  });
}
