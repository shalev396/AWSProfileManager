import { Tray, Menu, nativeImage, Notification, app } from 'electron';
import * as fs from 'fs';
import { loadAppNativeImage } from './appIcon';
export interface TrayAccount {
  id: string;
  profileName: string;
  displayName: string;
  logoPath?: string;
  authType: 'iam' | 'sso';
}

export class TrayManager {
  private tray: Tray | null = null;
  private defaultIcon: Electron.NativeImage | null = null;

  constructor() {
    this.defaultIcon = loadAppNativeImage();
  }

  createTray(): void {
    const size = 18;
    const icon = this.defaultIcon
      ? this.defaultIcon.resize({ width: size, height: size })
      : nativeImage.createEmpty();
    this.tray = new Tray(icon);
    this.tray.setToolTip('AWS Profile Manager');
  }

  updateIcon(logoPath: string | null): void {
    if (!this.tray) {return;}
    
    const image = this.getIconPath(logoPath);
    this.tray.setImage(image);
  }

  updateMenu(
    accounts: TrayAccount[],
    activeAccountId: string | null,
    onSetActive: (accountId: string) => void,
    onManage: () => void,
  ): void {
    if (!this.tray) {return;}

    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    if (activeAccountId) {
      const activeAccount = accounts.find((a) => a.id === activeAccountId);
      const displayName = activeAccount?.displayName || activeAccount?.profileName || activeAccountId;
      menuItems.push({
        label: `Active: ${displayName}`,
        enabled: false,
      });
      menuItems.push({ type: 'separator' });
    } else {
      menuItems.push({
        label: 'No active profile',
        enabled: false,
      });
      menuItems.push({ type: 'separator' });
    }

    if (accounts.length > 0) {
      accounts.forEach((account) => {
        const isActive = account.id === activeAccountId;
        const displayName = account.displayName || account.profileName;
        menuItems.push({
          label: `${isActive ? '✓ ' : ''}${displayName}`,
          type: 'normal',
          click: () => {
            if (!isActive) {
              onSetActive(account.id);
            }
          },
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
    if (!this.tray) {return;}
    this.tray.setToolTip(text);
  }

  /** Dismiss after ~10s where the platform allows programmatic close (see Electron `Notification.close`). */
  private static readonly NOTIFICATION_MS = 10_000;

  showNotification(title: string, body: string): void {
    if (!Notification.isSupported()) {return;}
    const n = new Notification({
      title,
      body,
      timeoutType: 'default',
    });
    n.show();
    const t = setTimeout(() => {
      try {
        n.close();
      } catch {
        /* ignore */
      }
    }, TrayManager.NOTIFICATION_MS);
    n.once('close', () => { clearTimeout(t); });
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private getIconPath(logoPath: string | null): Electron.NativeImage {
    const size = 18;

    if (logoPath && fs.existsSync(logoPath)) {
      const image = nativeImage.createFromPath(logoPath);
      if (!image.isEmpty()) {return image.resize({ width: size, height: size });}
    }

    if (this.defaultIcon) {return this.defaultIcon.resize({ width: size, height: size });}
    return nativeImage.createEmpty();
  }
}
