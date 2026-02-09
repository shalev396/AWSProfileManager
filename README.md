# AWS Profile Manager

Desktop app to manage AWS CLI profiles. Switch between multiple AWS accounts from your system tray without using `--profile` flags.

**Supported platforms:** Windows, macOS (Intel and Apple Silicon), and Linux.

## Install the app

You can install the desktop app from the download page:

- **Download page:** [Install AWS Profile Manager](https://awsprofilemanager.shalev396.com) — get the latest installers for Windows, macOS, and Linux.

If you host your own build, use your downloads URL (e.g. `https://your-domain.com/downloads/`).

## Project structure

- **`electron/`** — Desktop app (Electron + React). Run locally or build installers here.
- **`web/`** — Static website with download links.
- **`aws/`** — Infrastructure (for deploy; optional).

## Development

**Prerequisites:** Node.js 18+ ([download](https://nodejs.org/)).

### Run the desktop app locally

```bash
cd electron
npm install
npm run dev
```

The app appears in the system tray. Use the tray icon → **Manage Accounts…** to add or edit profiles.

### Build installers (optional)

```bash
cd electron
npm run package:mac    # macOS
npm run package:win    # Windows
npm run package:linux # Linux
```

Built files are in `electron/dist/`.

## Using the app

### Windows

- App runs in the **system tray** (bottom right). Click the icon → **Manage Accounts…** to open.
- Credentials: `%USERPROFILE%\.aws\`

### macOS

- App runs in the **menu bar** (top right). Closing the window hides it; use the tray icon to reopen.
- Credentials: `~/.aws/`
- You may need to allow the app in **System Preferences → Security & Privacy**.

### Linux

- Uses the system tray if supported.
- App data: `~/.config/aws-profile-manager/`
- AWS files: `~/.aws/credentials` and `~/.aws/config`
- Make AppImage executable: `chmod +x AWS-Profile-Manager*.AppImage`

## Data

- **App data** (accounts, logos): Shown in the app under **Data location**; you can open that folder from the app.
- **AWS credentials:** `~/.aws/credentials` and `~/.aws/config` (with `.bak` backups).

## Support

- [GitHub Issues](https://github.com/shalev396/AWSProfileManager/issues)
