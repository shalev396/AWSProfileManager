# AWS Profile Manager (Desktop App)

> **Disclaimer:** This is an unofficial, community-built tool. It is not affiliated with, endorsed by, or sponsored by Amazon Web Services (AWS) or Amazon.com, Inc. "AWS" and related names are trademarks of Amazon.com, Inc.

Desktop app to manage AWS CLI profiles. Switch between multiple AWS accounts from your system tray.

**Supported:** Windows, macOS (Intel and Apple Silicon), Linux.

## Install

You can install the app from here:

- **Releases / download page:** [Install AWS Profile Manager](https://awsprofilemanager.shalev396.com)

Pick the installer for your OS: Windows (`.exe`), macOS (`.dmg`), or Linux (`.AppImage`).

## Run locally (development)

**Prerequisites:** Node.js 20+ ([download](https://nodejs.org/)).

```bash
npm install
npm run dev
```

The app appears in the system tray (Windows: bottom right; macOS: menu bar top right). Click the tray icon → **Manage Accounts…** to add or edit profiles.

## Using the app

- **Switch profile:** Click the tray icon and choose an account.
- **Add or edit accounts:** Tray icon → **Manage Accounts…**
- **Data location:** Shown at the bottom of the Manage window; you can open that folder from the app.
- **Local database:** `app-data.sqlite` under Electron **userData** (path shown in the app) stores account metadata and encrypted secrets (`safeStorage`). Logos live in **`logos/`** next to it.
- **AWS files:** The active profile is synced to `~/.aws` (macOS/Linux) or `%USERPROFILE%\.aws` (Windows) so the CLI can use it. Backups (`.bak`) are created before changes.

### Windows

Tray is bottom right. Credentials in `%USERPROFILE%\.aws\`.

### macOS

Tray is menu bar (top right). Closing the window only hides the app; use the tray to reopen. Credentials in `~/.aws/`. You may need to allow the app in **System Preferences → Security & Privacy**.

### Linux

Uses system tray if supported. App data uses Electron **userData** (path is shown in the app). Install/configure a **keyring** (e.g. libsecret) so secrets can be encrypted. For AppImage, mark the file executable in your file manager if your OS requires it, then run it.

## Updating

The app checks for updates automatically on startup. When a new version is available, it downloads in the background and a dialog asks whether to restart now or later. If you choose **Later**, the update installs the next time you quit the app (right-click tray → **Quit**).

You can also update manually: download the latest installer from the [releases page](https://github.com/shalev396/AWSProfileManager/releases/latest) and run it. No need to uninstall first.

### Troubleshooting updates

If an update doesn't appear, open **Settings → Application logs → Open folder** and check `main.log` for diagnostic output from the auto-updater.

## Build installers (optional)

```bash
npm run package:mac    # macOS .dmg
npm run package:win   # Windows .exe
npm run package:linux # Linux .AppImage
```

Output is in `dist/`.

## Native module note (`postinstall`)

`better-sqlite3` ships a **native** addon built for Node’s ABI. Electron ships its own Node, so after `npm install` the **`postinstall`** script runs **`@electron/rebuild`** to compile `better-sqlite3` for **your installed Electron version**. That is not a shelling out to `aws` or OS-specific CLI tools—it is the standard way native addons stay compatible with Electron. The deprecation warnings you may see come from older transitive tooling inside the rebuild pipeline, not from the app at runtime.
