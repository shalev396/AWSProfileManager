# AWS Profile Manager

Desktop app to manage AWS CLI profiles. Switch between multiple AWS accounts from your system tray without using `--profile` flags. Manages credentials in standard `~/.aws` files and lets you set a custom logo per account.

**Supported operating systems:** Windows, macOS (Intel and Apple Silicon), and Linux.

## How to install

- **Node.js 18+** required ([download](https://nodejs.org/)).
- Install dependencies and run:
  ```bash
  npm install
  npm run dev
  ```
- Platform-specific notes (run, tray location, build) are below.

---

- [Windows](#windows)
- [macOS](#macos)
- [Linux](#linux)

### Windows

1. Run `npm run dev`. The app appears in the **system tray** (bottom right).
2. Click the tray icon → **Manage Accounts…** to add or edit profiles.
3. To build an installer: `npm run package:win` → `dist/AWS Profile Manager Setup.exe`.

### macOS

1. Run `npm run dev`. The app appears in the **menu bar** (top right). Closing the window only hides it; use the tray icon → **Manage Accounts…** to open again.
2. To build: `npm run package:mac` → `dist/AWS Profile Manager.dmg`. The Dock shows "AWS Profile Manager" when using the built app.

### Linux

1. Run `npm run dev`. The app uses the system tray if your environment supports it.
2. App data: `~/.config/aws-profile-manager/` (accounts and logos).
3. AWS files: `~/.aws/credentials` and `~/.aws/config`.

---

**Data and AWS files**

- App data (accounts, logos): see **Data location** at the bottom of the app window; you can open that folder from the app.
- AWS credentials and config are in `~/.aws` (macOS/Linux) or `%USERPROFILE%\.aws` (Windows). Backups (`.bak`) are created before changes.
