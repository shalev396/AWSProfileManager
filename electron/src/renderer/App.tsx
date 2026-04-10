import React, { useState, useEffect } from "react";
import AppHeader from "./components/AppHeader";
import MainNav, { type MainTab } from "./components/MainNav";
import SettingsPanel from "./components/SettingsPanel";
import AccountList from "./components/AccountList";
import AccountForm from "./components/AccountForm";
import SsoLoginPrompt from "./components/SsoLoginPrompt";
import type {
  Account,
  AccountFormData,
  SsoDeviceAuthorizationEvent,
} from "./types";
import { accountClient } from "./services/accountClient";
import { appClient } from "./services/appClient";

function parseAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) {return [];}
  return raw as Account[];
}

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [dataPaths, setDataPaths] = useState<{
    appDataDir: string;
    awsCredentials: string;
    awsConfig: string;
  } | null>(null);
  const [encryptionOk, setEncryptionOk] = useState(true);
  const [encryptionDebug, setEncryptionDebug] = useState("");
  /** Bumps on each open so AccountForm remounts (avoids stale state / races after delete or re-open). */
  const [formMountKey, setFormMountKey] = useState(0);
  /** Shown after StartDeviceAuthorization — same userCode as in the browser (device flow). */
  const [ssoDevicePrompt, setSsoDevicePrompt] = useState<{
    accountId: string;
    userCode: string;
    verificationUri?: string;
  } | null>(null);
  const [ssoBanner, setSsoBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [switchNotice, setSwitchNotice] = useState<
    | null
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | { type: "sso_login"; accountId: string; message: string }
  >(null);
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [launchAtLoginOsApplies, setLaunchAtLoginOsApplies] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("profiles");
  const [appVersion, setAppVersion] = useState("");
  const [appIconDataUrl, setAppIconDataUrl] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [
        accountsResult,
        activeResult,
        paths,
        enc,
        launch,
        ver,
        icon,
      ] = await Promise.all([
        accountClient.list(),
        accountClient.getActive(),
        window.electron.app.getDataPaths(),
        window.electron.app.getEncryptionStatus(),
        appClient.getLaunchAtLogin(),
        appClient.getAppVersion(),
        appClient.getAppIconDataUrl(),
      ]);

      if (accountsResult.success) {
        setAccounts(parseAccounts(accountsResult.data));
      }

      if (activeResult.success) {
        setActiveAccountId(activeResult.data ?? null);
      }

      setDataPaths(paths);
      setEncryptionOk(enc.available);
      setEncryptionDebug(enc.debug);
      setLaunchAtLogin(launch.openAtLogin);
      setLaunchAtLoginOsApplies(launch.osControlsApply);
      setAppVersion(ver.version);
      setAppIconDataUrl(icon);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.app.onStateChanged(() => {
      void loadData();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = accountClient.onSsoDeviceAuthorization(
      (payload: SsoDeviceAuthorizationEvent) => {
        setSsoDevicePrompt({
          accountId: payload.accountId,
          userCode: payload.userCode,
          verificationUri: payload.verificationUri,
        });
      },
    );
    return () => { unsubscribe(); };
  }, []);

  const handleAddAccount = () => {
    setFormMode("add");
    setEditingAccount(undefined);
    setFormMountKey((k) => k + 1);
    setShowForm(true);
  };

  const handleEditAccount = (account: Account) => {
    setFormMode("edit");
    setEditingAccount(account);
    setFormMountKey((k) => k + 1);
    setShowForm(true);
  };

  const handleSaveAccount = async (
    data: AccountFormData,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result =
        formMode === "add"
          ? await accountClient.create(data)
          : await accountClient.update(data);

      if (result.success) {
        setShowForm(false);
        await loadData();
        return { success: true };
      }
      return { success: false, error: result.error ?? "Unknown error" };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const result = await accountClient.delete(accountId);

      if (result.success) {
        if (editingAccount?.id === accountId) {
          setShowForm(false);
          setEditingAccount(undefined);
          setFormMode("add");
        }
        await loadData();
      } else {
        console.error("Delete account failed:", result.error);
      }
    } catch (error: unknown) {
      console.error("Delete account failed:", error);
    }
  };

  const handleSetActive = async (account: Account) => {
    setSwitchNotice(null);
    try {
      const result = await accountClient.switch(account.id);
      const label = account.name || account.profileName;

      if (result.success) {
        await loadData();
        const message =
          result.verified && result.identity
            ? `Switched to ${label} — account ${result.identity.account}, ${result.identity.arn}`
            : `Switched to ${label}`;
        setSwitchNotice({ type: "success", message });
      } else if (result.requiresSsoLogin) {
        setSwitchNotice({
          type: "sso_login",
          accountId: account.id,
          message: result.error ?? "SSO login required.",
        });
      } else {
        setSwitchNotice({
          type: "error",
          message: result.error ?? "Could not switch profile.",
        });
      }
    } catch (error: unknown) {
      setSwitchNotice({
        type: "error",
        message: (error as Error).message,
      });
    }
  };

  const handleSsoLogin = async (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    const label = acc?.name || acc?.profileName || accountId;
    setSsoBanner(null);
    setSsoDevicePrompt(null);
    try {
      const result = await accountClient.ssoLogin(accountId);
      setSsoDevicePrompt(null);
      if (result.success) {
        const unchanged = result.accessExpiryUnchanged === true;
        setSsoBanner({
          kind: "ok",
          text: unchanged
            ? `Signed in: ${label}. “Until” is unchanged because IAM Identity Center reused your current OIDC access token (still valid until that time).`
            : `Signed in: ${label}`,
        });
        await loadData();
      } else {
        setSsoBanner({
          kind: "err",
          text: result.error ?? "SSO login failed",
        });
      }
    } catch (error: unknown) {
      setSsoDevicePrompt(null);
      setSsoBanner({ kind: "err", text: (error as Error).message });
    }
  };

  const handleRefresh = () => {
    void loadData();
  };

  const handleLaunchAtLoginChange = async (enabled: boolean) => {
    setLaunchAtLogin(enabled);
    try {
      await appClient.setLaunchAtLogin(enabled);
      const next = await appClient.getLaunchAtLogin();
      setLaunchAtLogin(next.openAtLogin);
      setLaunchAtLoginOsApplies(next.osControlsApply);
    } catch (e) {
      console.error(e);
      const next = await appClient.getLaunchAtLogin();
      setLaunchAtLogin(next.openAtLogin);
    }
  };

  const showAccountGrid = mainTab === "profiles";

  if (loading) {
    return (
      <div style={styles.app}>
        <div style={styles.appShell}>
          <div style={styles.appShellInner}>
            <div style={styles.loading}>Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  const activeAccount =
    activeAccountId !== null
      ? accounts.find((a) => a.id === activeAccountId) ?? null
      : null;

  const activeProfileLabel = activeAccount
    ? activeAccount.name || activeAccount.profileName
    : null;

  return (
    <div style={styles.app}>
      <div style={styles.appShell}>
        <div style={styles.appShellInner}>
          <AppHeader
            iconDataUrl={appIconDataUrl}
            title="AWS Profile Manager"
            subtitle="Switch the default AWS CLI profile, IAM keys, and IAM Identity Center (SSO) from one place."
            activeProfileLabel={activeProfileLabel}
          />
          <MainNav value={mainTab} onChange={setMainTab} />

          <main style={styles.main}>
            {!encryptionOk && (
              <div style={styles.encWarning}>
                <strong>Secure storage unavailable.</strong> Account passwords and SSO
                tokens cannot be saved safely on this system. {encryptionDebug}
              </div>
            )}
            {ssoBanner && (
              <div
                style={
                  ssoBanner.kind === "ok" ? styles.ssoBannerOk : styles.ssoBannerErr
                }
              >
                {ssoBanner.text}
                <button
                  type="button"
                  style={styles.ssoBannerDismiss}
                  onClick={() => { setSsoBanner(null); }}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
            {switchNotice && (
              <div
                style={
                  switchNotice.type === "success"
                    ? styles.switchBannerOk
                    : switchNotice.type === "sso_login"
                      ? styles.switchBannerSso
                      : styles.switchBannerErr
                }
              >
                <div style={styles.switchBannerBody}>
                  <span>{switchNotice.message}</span>
                  {switchNotice.type === "sso_login" && (
                    <button
                      type="button"
                      style={styles.switchBannerCta}
                      onClick={() => {
                        const id = switchNotice.accountId;
                        setSwitchNotice(null);
                        void handleSsoLogin(id);
                      }}
                    >
                      SSO Login
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  style={styles.ssoBannerDismiss}
                  onClick={() => { setSwitchNotice(null); }}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
            {showAccountGrid ? (
              <AccountList
                accounts={accounts}
                activeAccountId={activeAccountId}
                onSetActive={handleSetActive}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
                onAdd={handleAddAccount}
                onRefresh={handleRefresh}
                onSsoLogin={handleSsoLogin}
              />
            ) : null}
            {mainTab === "settings" && dataPaths ? (
              <SettingsPanel
                appDataDir={dataPaths.appDataDir}
                awsConfig={dataPaths.awsConfig}
                launchAtLogin={launchAtLogin}
                launchAtLoginOsApplies={launchAtLoginOsApplies}
                onOpenDataFolder={() => window.electron.app.openDataFolder()}
                onOpenLogFolder={() => window.electron.app.openLogFolder()}
                onLaunchAtLoginChange={(enabled) =>
                  void handleLaunchAtLoginChange(enabled)
                }
              />
            ) : null}
            {mainTab === "settings" && !dataPaths ? (
              <div style={styles.settingsLoading}>Loading settings…</div>
            ) : null}
          </main>

          <footer style={styles.statusBar}>
            <span style={styles.statusLeft}>
              {accounts.length} profile{accounts.length === 1 ? "" : "s"} configured
              <span style={styles.disclaimer}>
                {" · "}Not affiliated with AWS or Amazon.com, Inc.
              </span>
            </span>
            <span style={styles.statusRight}>
              {appVersion ? `v${appVersion}` : ""}
            </span>
          </footer>
        </div>
      </div>

      {ssoDevicePrompt && (
        <SsoLoginPrompt
          accountLabel={(() => {
            const row = accounts.find((a) => a.id === ssoDevicePrompt.accountId);
            return row?.name || row?.profileName || ssoDevicePrompt.accountId;
          })()}
          userCode={ssoDevicePrompt.userCode}
          verificationUri={ssoDevicePrompt.verificationUri}
        />
      )}

      {showForm && (
        <AccountForm
          key={`${formMode}-${editingAccount?.id ?? "new"}-${formMountKey}`}
          mode={formMode}
          account={editingAccount}
          onSave={handleSaveAccount}
          onCancel={() => {
            setShowForm(false);
            setEditingAccount(undefined);
            setFormMode("add");
          }}
        />
      )}
    </div>
  );
};

const purple = {
  primary: "#7c3aed",
  bg: "#faf5ff",
  border: "#ede9fe",
  text: "#1f2937",
  muted: "#6b7280",
};

const styles = {
  app: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: purple.bg,
    boxSizing: "border-box",
  } as React.CSSProperties,
  appShell: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: "min(1520px, calc(100vw - 24px))",
    margin: "0 auto",
    padding: "10px 12px 16px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  } as React.CSSProperties,
  appShellInner: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    borderRadius: "14px",
    border: `1px solid ${purple.border}`,
    boxShadow: "0 8px 32px rgba(76, 29, 149, 0.07)",
    overflow: "hidden",
  } as React.CSSProperties,
  main: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    background: "#fff",
  } as React.CSSProperties,
  encWarning: {
    margin: "12px 16px 0",
    padding: "12px 16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#991b1b",
    fontSize: "13px",
  } as React.CSSProperties,
  ssoBannerOk: {
    margin: "12px 16px 0",
    padding: "10px 14px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "8px",
    color: "#065f46",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  } as React.CSSProperties,
  ssoBannerErr: {
    margin: "12px 16px 0",
    padding: "10px 14px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#991b1b",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  } as React.CSSProperties,
  ssoBannerDismiss: {
    flexShrink: 0,
    border: "none",
    background: "transparent",
    fontSize: "20px",
    lineHeight: 1,
    cursor: "pointer",
    color: "inherit",
    opacity: 0.7,
    padding: "0 4px",
  } as React.CSSProperties,
  switchBannerOk: {
    margin: "12px 16px 0",
    padding: "10px 14px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "8px",
    color: "#065f46",
    fontSize: "13px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  } as React.CSSProperties,
  switchBannerErr: {
    margin: "12px 16px 0",
    padding: "10px 14px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#991b1b",
    fontSize: "13px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  } as React.CSSProperties,
  switchBannerSso: {
    margin: "12px 16px 0",
    padding: "10px 14px",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "8px",
    color: "#92400e",
    fontSize: "13px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  } as React.CSSProperties,
  switchBannerBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minWidth: 0,
  } as React.CSSProperties,
  switchBannerCta: {
    alignSelf: "flex-start",
    padding: "6px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  statusBar: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px 18px",
    borderTop: `1px solid ${purple.border}`,
    background: "#f9fafb",
    fontSize: "11px",
    color: purple.muted,
  } as React.CSSProperties,
  statusLeft: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  } as React.CSSProperties,
  statusRight: {
    flexShrink: 0,
    fontWeight: 600,
    color: "#9ca3af",
  } as React.CSSProperties,
  disclaimer: {
    opacity: 0.6,
    fontWeight: 400,
  } as React.CSSProperties,
  settingsLoading: {
    padding: "32px 20px",
    fontSize: "14px",
    color: purple.muted,
  } as React.CSSProperties,
  loading: {
    flex: 1,
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    color: purple.muted,
  } as React.CSSProperties,
};

export default App;
