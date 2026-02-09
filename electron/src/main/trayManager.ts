import { Tray, Menu, nativeImage, Notification, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Account } from './accountsStore';

export class TrayManager {
  private tray: Tray | null = null;
  private defaultIconPath: string;
  private defaultIcon: Electron.NativeImage | null = null;

  constructor() {
    const assetsDir = this.getAssetsDir();
    this.defaultIconPath = path.join(assetsDir, 'icon.png');

    if (fs.existsSync(this.defaultIconPath)) {
      this.defaultIcon = nativeImage.createFromPath(this.defaultIconPath);
      if (this.defaultIcon.isEmpty()) this.defaultIcon = null;
    }
  }

  /** Resolve assets directory (works in dev and packaged app) */
  private getAssetsDir(): string {
    const appPath = app.getAppPath();
    const candidate = path.join(appPath, 'assets');
    if (fs.existsSync(candidate)) return candidate;
    return path.join(__dirname, '../../assets');
  }

  createTray(): void {
    const size = os.platform() === 'darwin' ? 22 : 16;
    const icon = this.defaultIcon
      ? this.defaultIcon.resize({ width: size, height: size })
      : nativeImage.createEmpty();
    this.tray = new Tray(icon);
    this.tray.setToolTip('AWS Profile Manager');
  }

  updateIcon(logoPath: string | null): void {
    if (!this.tray) return;
    
    const image = this.getIconPath(logoPath);
    this.tray.setImage(image);
  }

  updateMenu(accounts: Account[], activeProfile: string | null, onSetActive: (profileName: string) => void, onManage: () => void): void {
    if (!this.tray) return;

    const menuItems: any[] = [];

    // Show active profile at top
    if (activeProfile) {
      const activeAccount = accounts.find(a => a.profileName === activeProfile);
      const displayName = activeAccount?.displayName || activeProfile;
      menuItems.push({
        label: `Active: ${displayName}`,
        enabled: false
      });
      menuItems.push({ type: 'separator' });
    } else {
      menuItems.push({
        label: 'No active profile',
        enabled: false
      });
      menuItems.push({ type: 'separator' });
    }

    // Add account items
    if (accounts.length > 0) {
      accounts.forEach(account => {
        const isActive = account.profileName === activeProfile;
        const displayName = account.displayName || account.profileName;
        menuItems.push({
          label: `${isActive ? '✓ ' : ''}${displayName}`,
          type: 'normal',
          click: () => {
            if (!isActive) {
              onSetActive(account.profileName);
            }
          }
        });
      });
      menuItems.push({ type: 'separator' });
    }

    // Add management options
    menuItems.push({
      label: 'Manage Accounts...',
      click: onManage
    });
    
    menuItems.push({ type: 'separator' });
    
    menuItems.push({
      label: 'Quit',
      click: () => {
        app.quit();
      }
    });

    const contextMenu = Menu.buildFromTemplate(menuItems);
    this.tray.setContextMenu(contextMenu);
  }

  setTooltip(text: string): void {
    if (!this.tray) return;
    this.tray.setToolTip(text);
  }

  showNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      new Notification({
        title,
        body
      }).show();
    }
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private getIconPath(logoPath: string | null): Electron.NativeImage {
    const size = os.platform() === 'darwin' ? 22 : 16;

    if (logoPath && fs.existsSync(logoPath)) {
      const image = nativeImage.createFromPath(logoPath);
      if (!image.isEmpty()) return image.resize({ width: size, height: size });
    }

    if (this.defaultIcon) return this.defaultIcon.resize({ width: size, height: size });
    return nativeImage.createEmpty();
  }
}
