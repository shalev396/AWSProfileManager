import { app, Menu, shell } from 'electron';
import { APP_DISPLAY_NAME } from '../shared/windowChrome';

const REPO_URL = 'https://github.com/shalev396/AWSProfileManager';
const ISSUES_URL = `${REPO_URL}/issues`;

/**
 * Application menu
 *
 * **First menu label (all platforms)** — We use **`app.getName()`** everywhere (set in
 * `index.ts` via `app.setName`, aligned with `APP_DISPLAY_NAME`). So macOS, Windows, and
 * Linux all show the same **top-level name** on that first menu. What **differs** is only
 * the **submenu**: Apple’s Human Interface Guidelines require the macOS app menu to
 * include About, Services, Hide, etc.; on Windows/Linux we only need **Exit** in that slot.
 * That is normal for cross-platform Electron apps, not an inconsistency in the label.
 *
 * **Edit (Cut / Copy / Paste / Undo / …)** — Wired to the OS/Chromium text system for
 * forms, DevTools, and standard shortcuts.
 *
 * **Developer** — Only when `!app.isPackaged` (not in production installers).
 *
 * **Menu bar** — On Windows/Linux the strip is **OS-drawn**; we can’t theme it. The window
 * uses **`autoHideMenuBar: true`**: the menu is **hidden until you press Alt** (standard
 * Electron pattern). Shortcuts (Ctrl+C, etc.) still work; **Developer** items are still
 * registered when unpackaged.
 *
 * **Title bar** — Uses the **native** OS caption (Electron cannot safely recolor it on all
 * Windows setups without breaking layout next to the menu bar). **macOS** / **Linux** use
 * their normal window decorations.
 */
export function setApplicationMenu(): void {
  const isMac = process.platform === 'darwin';
  const showDevItems = !app.isPackaged;
  const appMenuLabel = app.getName();

  const template: Electron.MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: appMenuLabel,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  } else {
    template.push({
      label: appMenuLabel,
      submenu: [
        { role: 'quit', label: `Exit ${APP_DISPLAY_NAME}` },
      ],
    });
  }

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' },
    ],
  });

  if (isMac) {
    template.push({
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    });
  }

  if (showDevItems) {
    template.push({
      label: 'Developer',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    });
  }

  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'GitHub repository',
        click: () => void shell.openExternal(REPO_URL),
      },
      {
        label: 'Report an issue',
        click: () => void shell.openExternal(ISSUES_URL),
      },
    ],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
