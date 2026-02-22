import { ipcMain, dialog, BrowserWindow, shell } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as awsFiles from "./awsFiles";
import * as accountsStore from "./accountsStore";
import { Account, AuthType } from "./accountsStore";

const execAsync = promisify(exec);

/** Env with PATH that includes common locations for the AWS CLI (GUI apps often have minimal PATH). */
function getExecEnv(): NodeJS.ProcessEnv {
  const base = process.env.PATH || "";
  const sep = process.platform === "win32" ? ";" : ":";
  const extra =
    process.platform === "darwin"
      ? "/usr/local/bin:/opt/homebrew/bin"
      : process.platform === "win32"
        ? [
            process.env.ProgramFiles && `${process.env.ProgramFiles}\\Amazon\\AWSCLIV2`,
            process.env["ProgramFiles(x86)"] && `${process.env["ProgramFiles(x86)"]}\\Amazon\\AWSCLIV2`,
            process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Programs\\Amazon\\AWSCLIV2`,
          ]
            .filter(Boolean)
            .join(";")
        : "/usr/local/bin";
  return { ...process.env, PATH: extra ? `${base}${sep}${extra}` : base };
}

export interface AddAccountData {
  profileName: string;
  authType: AuthType;
  accessKeyId: string;
  secretAccessKey: string;
  ssoStartUrl?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  ssoRegion?: string;
  ssoSessionName?: string;
  region: string;
  output: string;
  logoPath?: string;
  displayName?: string;
}

let trayUpdateCallback: (() => void) | null = null;
let mainWindowRef: BrowserWindow | null = null;

export function setTrayUpdateCallback(callback: () => void): void {
  trayUpdateCallback = callback;
}

/** Notify the renderer that accounts/active profile changed (e.g. from tray) so UI can refresh. */
export function notifyRendererStateChanged(): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send("app:stateChanged");
  }
}

function validateProfileName(profileName: string): void {
  if (!profileName || !/^[a-zA-Z0-9-_]+$/.test(profileName)) {
    throw new Error(
      "Profile name must contain only letters, numbers, hyphens, and underscores",
    );
  }
}

function validateAccessKey(accessKeyId: string): void {
  if (!accessKeyId || accessKeyId.length < 16) {
    throw new Error("Invalid access key ID");
  }
}

function validateSecretKey(secretAccessKey: string): void {
  if (!secretAccessKey || secretAccessKey.length < 40) {
    throw new Error(
      "Invalid secret access key (must be at least 40 characters)",
    );
  }
}

export function setupIpcHandlers(mainWindow: BrowserWindow | null): void {
  mainWindowRef = mainWindow;

  // Open file dialog to select an image (for account logo)
  ipcMain.handle("dialog:selectImage", async () => {
    const parentWindow = mainWindow ?? BrowserWindow.getFocusedWindow();
    if (!parentWindow) {
      return { canceled: true };
    }
    const result = await dialog.showOpenDialog(parentWindow, {
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, filePath: result.filePaths[0] };
  });

  // App data paths (so user can see where data is stored)
  ipcMain.handle("app:getDataPaths", async () => {
    const awsPaths = awsFiles.getAwsPaths();
    return {
      appDataDir: accountsStore.getAppDataDir(),
      logosDir: accountsStore.getLogosDir(),
      awsCredentials: awsPaths.credentials,
      awsConfig: awsPaths.config,
    };
  });

  ipcMain.handle("app:openDataFolder", async () => {
    const dir = accountsStore.getAppDataDir();
    await shell.openPath(dir);
  });

  // Logo as data URL so renderer can display it (file:// blocked by web security)
  ipcMain.handle("app:getLogoDataUrl", async (_event, logoPath: string) => {
    if (!logoPath) return null;
    try {
      await fs.access(logoPath);
      const buf = await fs.readFile(logoPath);
      const ext = path.extname(logoPath).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".gif"
              ? "image/gif"
              : ext === ".webp"
                ? "image/webp"
                : "image/png";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  });

  // Access key only (for display in edit form; never expose secret)
  ipcMain.handle(
    "accounts:getAccessKey",
    async (_event, profileName: string) => {
      try {
        const creds = await awsFiles.getProfileCredentials(profileName);
        if (!creds) return { success: true, data: null };
        return { success: true, data: { accessKeyId: creds.accessKeyId } };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // List all accounts
  ipcMain.handle("accounts:list", async () => {
    try {
      const data = await accountsStore.loadAccounts();
      return { success: true, data: data.accounts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get active profile
  ipcMain.handle("accounts:getActive", async () => {
    try {
      const activeProfile = await accountsStore.getActiveProfile();
      return { success: true, data: activeProfile };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // List profiles from AWS files
  ipcMain.handle("profiles:listFromAws", async () => {
    try {
      const profiles = await awsFiles.listProfiles();
      return { success: true, data: profiles };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Add new account
  ipcMain.handle(
    "accounts:add",
    async (_event, accountData: AddAccountData) => {
      try {
        validateProfileName(accountData.profileName);
        const authType = accountData.authType || 'access-key';

        if (authType === 'sso') {
          if (!accountData.ssoStartUrl || !accountData.ssoAccountId || !accountData.ssoRoleName) {
            throw new Error("SSO Start URL, Account ID, and Role Name are required");
          }
          const ssoSessionName = accountData.ssoSessionName || `${accountData.profileName}-session`;
          await awsFiles.upsertSsoProfileConfig({
            profileName: accountData.profileName,
            ssoSessionName,
            ssoAccountId: accountData.ssoAccountId,
            ssoRoleName: accountData.ssoRoleName,
            ssoStartUrl: accountData.ssoStartUrl,
            ssoRegion: accountData.ssoRegion || accountData.region || "us-east-1",
            region: accountData.region || "us-east-1",
            output: accountData.output || "json",
          });
        } else {
          validateAccessKey(accountData.accessKeyId);
          validateSecretKey(accountData.secretAccessKey);

          await awsFiles.upsertProfileCredentials(
            accountData.profileName,
            accountData.accessKeyId,
            accountData.secretAccessKey,
          );

          await awsFiles.upsertProfileConfig(
            accountData.profileName,
            accountData.region || "us-east-1",
            accountData.output || "json",
          );
        }

        let storedLogoPath: string | undefined;
        if (accountData.logoPath) {
          try {
            storedLogoPath = await accountsStore.copyLogoToStore(
              accountData.logoPath,
              accountData.profileName,
            );
          } catch {
            storedLogoPath = undefined;
          }
        }

        const account: Account = {
          profileName: accountData.profileName,
          authType,
          displayName: accountData.displayName,
          logoPath: storedLogoPath,
          region: accountData.region,
          output: accountData.output,
          ...(authType === 'sso' ? {
            ssoStartUrl: accountData.ssoStartUrl,
            ssoAccountId: accountData.ssoAccountId,
            ssoRoleName: accountData.ssoRoleName,
            ssoRegion: accountData.ssoRegion,
            ssoSessionName: accountData.ssoSessionName || `${accountData.profileName}-session`,
          } : {}),
        };

        await accountsStore.addAccount(account);

        if (trayUpdateCallback) trayUpdateCallback();
        notifyRendererStateChanged();

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Edit existing account
  ipcMain.handle(
    "accounts:edit",
    async (_event, accountData: AddAccountData) => {
      try {
        validateProfileName(accountData.profileName);
        const authType = accountData.authType || 'access-key';

        if (authType === 'sso') {
          if (!accountData.ssoStartUrl || !accountData.ssoAccountId || !accountData.ssoRoleName) {
            throw new Error("SSO Start URL, Account ID, and Role Name are required");
          }
          const ssoSessionName = accountData.ssoSessionName || `${accountData.profileName}-session`;
          await awsFiles.upsertSsoProfileConfig({
            profileName: accountData.profileName,
            ssoSessionName,
            ssoAccountId: accountData.ssoAccountId,
            ssoRoleName: accountData.ssoRoleName,
            ssoStartUrl: accountData.ssoStartUrl,
            ssoRegion: accountData.ssoRegion || accountData.region || "us-east-1",
            region: accountData.region || "us-east-1",
            output: accountData.output || "json",
          });
        } else {
          if (accountData.accessKeyId) {
            validateAccessKey(accountData.accessKeyId);
            let secret = accountData.secretAccessKey;
            if (!secret || secret.trim() === "") {
              const existing = await awsFiles.getProfileCredentials(
                accountData.profileName,
              );
              secret = existing?.secretAccessKey ?? "";
            }
            if (secret) {
              validateSecretKey(secret);
              await awsFiles.upsertProfileCredentials(
                accountData.profileName,
                accountData.accessKeyId,
                secret,
              );
            }
          }

          await awsFiles.upsertProfileConfig(
            accountData.profileName,
            accountData.region || "us-east-1",
            accountData.output || "json",
          );
        }

        let storedLogoPath: string | undefined;
        if (accountData.logoPath) {
          try {
            storedLogoPath = await accountsStore.copyLogoToStore(
              accountData.logoPath,
              accountData.profileName,
            );
          } catch {
            storedLogoPath = undefined;
          }
        } else {
          await accountsStore.removeStoredLogo(accountData.profileName);
          storedLogoPath = undefined;
        }

        await accountsStore.updateAccount(accountData.profileName, {
          authType,
          displayName: accountData.displayName,
          logoPath: storedLogoPath,
          region: accountData.region,
          output: accountData.output,
          ...(authType === 'sso' ? {
            ssoStartUrl: accountData.ssoStartUrl,
            ssoAccountId: accountData.ssoAccountId,
            ssoRoleName: accountData.ssoRoleName,
            ssoRegion: accountData.ssoRegion,
            ssoSessionName: accountData.ssoSessionName || `${accountData.profileName}-session`,
          } : {
            ssoStartUrl: undefined,
            ssoAccountId: undefined,
            ssoRoleName: undefined,
            ssoRegion: undefined,
            ssoSessionName: undefined,
          }),
        });

        if (trayUpdateCallback) trayUpdateCallback();
        notifyRendererStateChanged();

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Delete account
  ipcMain.handle("accounts:delete", async (_event, profileName: string) => {
    try {
      await awsFiles.deleteProfile(profileName);
      await accountsStore.removeAccount(profileName);
      await accountsStore.removeStoredLogo(profileName);

      // Update tray and notify renderer
      if (trayUpdateCallback) trayUpdateCallback();
      notifyRendererStateChanged();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Set active account
  ipcMain.handle("accounts:setActive", async (_event, profileName: string) => {
    try {
      // Switch AWS default profile
      await awsFiles.setDefaultFromProfile(profileName);

      // Update app metadata
      await accountsStore.setActiveProfile(profileName);

      // Update tray and notify renderer so UI reflects tray switch
      if (trayUpdateCallback) trayUpdateCallback();
      notifyRendererStateChanged();

      // Try to verify the switch (optional, don't fail if aws CLI not available)
      try {
        const { stdout } = await execAsync(
          "aws sts get-caller-identity --output json",
          { env: getExecEnv() },
        );
        const identity = JSON.parse(stdout);
        return {
          success: true,
          verified: true,
          identity: {
            account: identity.Account,
            arn: identity.Arn,
          },
        };
      } catch {
        // AWS CLI not available or not configured, but switch succeeded
        return { success: true, verified: false };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Verify credentials
  ipcMain.handle("accounts:verify", async (_event, profileName: string) => {
    try {
      const cmd =
        profileName === "default"
          ? "aws sts get-caller-identity --output json"
          : `aws sts get-caller-identity --profile ${profileName} --output json`;

      const { stdout } = await execAsync(cmd, { env: getExecEnv() });
      const identity = JSON.parse(stdout);

      return {
        success: true,
        identity: {
          account: identity.Account,
          userId: identity.UserId,
          arn: identity.Arn,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to verify credentials",
      };
    }
  });

  // SSO Login - triggers browser-based auth
  ipcMain.handle("accounts:ssoLogin", async (_event, profileName: string) => {
    try {
      const cmd = `aws sso login --profile ${profileName}`;
      await execAsync(cmd, { env: getExecEnv(), timeout: 120000 });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "SSO login failed",
      };
    }
  });

  // Get SSO config for a profile (for edit form)
  ipcMain.handle("accounts:getSsoConfig", async (_event, profileName: string) => {
    try {
      const config = await awsFiles.getSsoProfileConfig(profileName);
      return { success: true, data: config };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
