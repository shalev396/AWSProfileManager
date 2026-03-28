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
- The **menu bar** (File, Edit, Help) stays visible under the title bar—no need to press Alt.
- The window uses the **standard Windows title bar** (minimize / maximize / close) so controls and the menu stay aligned like other desktop apps.
- Credentials: `%USERPROFILE%\.aws\`

### macOS

- App runs in the **menu bar** (top right). Closing the window hides it; use the tray icon to reopen.
- Credentials: `~/.aws/`
- You may need to allow the app in **System Preferences → Security & Privacy**.

### Linux

- Uses the system tray if supported.
- **App data** lives under Electron’s **userData** directory (see **Data** below); a desktop keyring (e.g. libsecret) is recommended so the app can encrypt secrets.
- AWS files: `~/.aws/credentials` and `~/.aws/config`
- If your distribution requires it, mark the AppImage as executable in your file manager before running it.

## IAM vs SSO in this app

- **IAM (access keys):** You configure an access key ID and secret. They stay valid until you rotate or delete them in IAM. The CLI uses them directly; there is no separate browser login in the app.
- **SSO (IAM Identity Center):** There are no long-lived API keys in the app. **SSO Login** runs AWS’s device flow in the browser. After you sign in and approve (**Allow access to your data?**), AWS issues short-lived **OIDC access tokens** (the app shows **time until expiry** on the card) and usually a **refresh token**. That browser step is **client consent** for this app to receive SSO session tokens—it is **not** a per-service permission (you do not repeat it for each S3 upload or API call). Day-to-day AWS calls use **temporary role credentials** derived from those tokens.
- **Set Active** on an SSO profile uses saved tokens and **refreshes the access token in the background** when it can, without opening the browser. If you are not signed in or the session can no longer be refreshed, the app prompts you to use **SSO Login** again.

### Start at login

- On **first run of the installed app** (not `npm run dev`), you are asked whether to start the app when you sign in to the computer. The app registers with the OS to start **hidden** (tray only) where supported.
- Change anytime: expand **Storage paths & startup** at the bottom → **Start at login**. In **development** (`npm run dev`), the choice is saved to `app-preferences.json` but only the **packaged** installer’s executable is registered with the OS for startup.

## Data

- **App data** (accounts, logos, SQLite DB): Shown in the app under **App data** in the footer (Electron `app.getPath('userData')`). The file **`app-data.sqlite`** holds account metadata and **OS-encrypted** secret blobs (via Electron `safeStorage`); logos are under **`logos/`**. **`app-preferences.json`** stores UI preferences (e.g. start-at-login). You can open the app data folder from the footer.
- **AWS CLI compatibility:** The active profile is still written to `~/.aws/credentials` and `~/.aws/config` (with `.bak` backups) so the normal `aws` CLI can use it. IAM keys in those files are **not** the app’s long-term source of truth; the app stores them encrypted in SQLite.

## Support

- [GitHub Issues](https://github.com/shalev396/AWSProfileManager/issues)
