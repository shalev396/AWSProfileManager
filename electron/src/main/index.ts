import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { ensureAwsDir } from './awsFiles';
import { loadAppNativeImage, resolveRasterIconPath } from './appIcon';
import { openDatabase } from './db/sqlite';
import { setupIpcHandlers, setTrayUpdateCallback, notifyRendererStateChanged } from './ipc/setupIpc';
import { TrayManager } from './trayManager';
import { getAccountService } from './accounts/accountService';
import type { AccountSummary } from './accounts/types';
import type { TrayAccount } from './trayManager';
import { offerOpenAtLoginOnFirstRun } from './launchAtLoginPrompt';
import { setApplicationMenu } from './applicationMenu';

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let isQuitting = false;

const APP_NAME = 'AWS Profile Manager';

/** Windows taskbar grouping + correct shortcut icon when running unpackaged. */
const APP_USER_MODEL_ID = 'com.shalev.aws-profile-manager';

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

/** Focus the one main window (tray “Manage”, shortcut, or second app launch). */
function showExistingMainWindow(): void {
  const win =
    mainWindow && !mainWindow.isDestroyed()
      ? mainWindow
      : BrowserWindow.getAllWindows()[0] ?? null;
  if (!win || win.isDestroyed()) {return;}
  if (win.isMinimized()) {win.restore();}
  win.show();
  win.focus();
}

function createWindow(iconImage: Electron.NativeImage | null): void {
  const rasterPath = resolveRasterIconPath();
  const winOpts: Electron.BrowserWindowConstructorOptions = {
    width: 960,
    height: 740,
    minWidth: 420,
    minHeight: 520,
    show: false,
    title: APP_NAME,
    backgroundColor: '#faf5ff',
    /** Standard OS caption; custom overlay was reverted (misaligned controls + menu on Windows). */
    /** Menu hidden until Alt — shortcuts still work. */
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  };
  if (iconImage && !iconImage.isEmpty()) {
    winOpts.icon = iconImage;
  } else if (rasterPath) {
    winOpts.icon = rasterPath;
  }
  mainWindow = new BrowserWindow(winOpts);

  const devRendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (devRendererUrl) {
    mainWindow.loadURL(devRendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
    void offerOpenAtLoginOnFirstRun(mainWindow);
  });

  mainWindow.on('page-title-updated', (e) => { e.preventDefault(); });
  mainWindow.setTitle(APP_NAME);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

async function updateTray(): Promise<void> {
  if (!trayManager) {return;}

  const svc = getAccountService();
  const summaries = svc.listSummaries();
  const activeAccountId = svc.getActiveAccountId();

  const accountsForTray: TrayAccount[] = summaries.map((s: AccountSummary) => ({
    id: s.id,
    profileName: s.profileName,
    displayName: s.name,
    authType: s.authType,
    ...(s.logoPath !== undefined && s.logoPath !== null && s.logoPath !== ''
      ? { logoPath: s.logoPath }
      : {}),
  }));

  trayManager.updateMenu(
    accountsForTray,
    activeAccountId,
    async (accountId: string) => {
      try {
        const result = await svc.switchAccount(accountId);
        await updateTray();
        const acc = accountsForTray.find((a: TrayAccount) => a.id === accountId);
        const label = acc?.displayName || acc?.profileName || accountId;
        if (result.error) {
          const msg = result.requiresSsoLogin
            ? `${result.error} Open the app and use SSO Login.`
            : result.error;
          trayManager?.showNotification('Error', msg);
        } else {
          trayManager?.showNotification('AWS Profile Switched', `Active profile: ${label}`);
        }
        notifyRendererStateChanged();
      } catch (error: unknown) {
        trayManager?.showNotification('Error', (error as Error).message);
      }
    },
    () => {
      showExistingMainWindow();
    },
  );

  if (activeAccountId) {
    const account = summaries.find((a: AccountSummary) => a.id === activeAccountId);
    trayManager.updateIcon(account?.logoPath ?? null);
    trayManager.setTooltip(`AWS Active: ${account?.name || account?.profileName || ''}`);
  } else {
    trayManager.updateIcon(null);
    trayManager.setTooltip('AWS Profile Manager - No active profile');
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showExistingMainWindow();
  });

  app.setName(APP_NAME);

  app.whenReady().then(async () => {
    try {
      setApplicationMenu();

      const appIcon = loadAppNativeImage();
      if (appIcon && !appIcon.isEmpty() && app.dock) {
        app.dock.setIcon(appIcon);
      }

      openDatabase();

      await ensureAwsDir();
      setTrayUpdateCallback(updateTray);

      trayManager = new TrayManager();
      trayManager.createTray();

      await updateTray();

      createWindow(appIcon);
      setupIpcHandlers(mainWindow);

      if (!process.env.ELECTRON_RENDERER_URL) {
        autoUpdater.checkForUpdatesAndNotify();
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow(loadAppNativeImage());
          setupIpcHandlers(mainWindow);
        } else {
          showExistingMainWindow();
        }
      });
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  });

  app.on('window-all-closed', () => {});

  app.on('before-quit', () => {
    isQuitting = true;
    if (trayManager) {
      trayManager.destroy();
    }
  });
}
