import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ensureAwsDir } from './awsFiles';
import { loadAccounts } from './accountsStore';
import { setupIpcHandlers, setTrayUpdateCallback } from './ipcHandlers';
import { TrayManager } from './trayManager';

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let isQuitting = false;

const APP_NAME = 'AWS Profile Manager';

function getAssetsDir(): string {
  const appPath = app.getAppPath();
  const candidate = path.join(appPath, 'assets');
  if (fs.existsSync(candidate)) return candidate;
  return path.join(__dirname, '../../assets');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // In development, load from dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('page-title-updated', (e) => e.preventDefault());
  mainWindow.setTitle(APP_NAME);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

async function updateTray(): Promise<void> {
  if (!trayManager) return;

  const appData = await loadAccounts();
  const activeProfile = appData.activeProfile;
  
  // Update tray menu
  trayManager.updateMenu(
    appData.accounts,
    activeProfile,
    async (profileName: string) => {
      // Handle profile switch from tray
      const { setDefaultFromProfile } = await import('./awsFiles');
      const { setActiveProfile } = await import('./accountsStore');
      
      try {
        await setDefaultFromProfile(profileName);
        await setActiveProfile(profileName);
        await updateTray();
        
        const account = appData.accounts.find(a => a.profileName === profileName);
        const displayName = account?.displayName || profileName;
        trayManager?.showNotification(
          'AWS Profile Switched',
          `Active profile: ${displayName}`
        );
      } catch (error: any) {
        trayManager?.showNotification(
          'Error',
          `Failed to switch profile: ${error.message}`
        );
      }
    },
    () => {
      // Handle "Manage Accounts" click
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  );

  // Update tray icon (use default icon when account has no logo)
  if (activeProfile) {
    const account = appData.accounts.find(a => a.profileName === activeProfile);
    trayManager.updateIcon(account?.logoPath ?? null);
    trayManager.setTooltip(`AWS Active: ${account?.displayName || activeProfile}`);
  } else {
    trayManager.updateIcon(null);
    trayManager.setTooltip('AWS Profile Manager - No active profile');
  }
}

// Set app name early so menu bar/Dock show "AWS Profile Manager" (in packaged app; in dev macOS may still show "Electron")
app.setName(APP_NAME);

app.whenReady().then(async () => {
  try {
    const assetsDir = getAssetsDir();
    const iconPath = path.join(assetsDir, 'icon.png');
    if (os.platform() === 'darwin' && fs.existsSync(iconPath)) {
      const { nativeImage } = await import('electron');
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) app.dock?.setIcon(icon);
    }

    await ensureAwsDir();
    setTrayUpdateCallback(updateTray);

    trayManager = new TrayManager();
    trayManager.createTray();

    // 5. Update tray with initial data
    await updateTray();

    // 6. Create window (hidden by default)
    createWindow();
    setupIpcHandlers(mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

app.on('window-all-closed', () => {
  // Don't quit when all windows are closed (tray app)
  // Users can quit via tray menu
});

app.on('before-quit', () => {
  isQuitting = true;
  if (trayManager) {
    trayManager.destroy();
  }
});
