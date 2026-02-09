# AWS Profile Manager (Desktop App)

Desktop app to manage AWS CLI profiles. Switch between multiple AWS accounts from your system tray.

**Supported:** Windows, macOS (Intel and Apple Silicon), Linux.

## Install

You can install the app from here:

- **Releases / download page:** [Install AWS Profile Manager](https://awsprofilemanager.shalev396.com)

Pick the installer for your OS: Windows (`.exe`), macOS (`.dmg`), or Linux (`.AppImage`).

## Run locally (development)

**Prerequisites:** Node.js 18+ ([download](https://nodejs.org/)).

```bash
npm install
npm run dev
```

The app appears in the system tray (Windows: bottom right; macOS: menu bar top right). Click the tray icon → **Manage Accounts…** to add or edit profiles.

## Using the app

- **Switch profile:** Click the tray icon and choose an account.
- **Add or edit accounts:** Tray icon → **Manage Accounts…**
- **Data location:** Shown at the bottom of the Manage window; you can open that folder from the app.
- **AWS files:** Credentials and config are in `~/.aws` (macOS/Linux) or `%USERPROFILE%\.aws` (Windows). Backups (`.bak`) are created before changes.

### Windows

Tray is bottom right. Credentials in `%USERPROFILE%\.aws\`.

### macOS

Tray is menu bar (top right). Closing the window only hides the app; use the tray to reopen. Credentials in `~/.aws/`. You may need to allow the app in **System Preferences → Security & Privacy**.

### Linux

Uses system tray if supported. App data: `~/.config/aws-profile-manager/`. For AppImage: `chmod +x AWS-Profile-Manager*.AppImage` then run it.

## Updating

Download the latest installer and run it. No need to uninstall first; the installer will upgrade the existing install.

## Build installers (optional)

```bash
npm run package:mac    # macOS .dmg
npm run package:win   # Windows .exe
npm run package:linux # Linux .AppImage
```

Output is in `dist/`.
