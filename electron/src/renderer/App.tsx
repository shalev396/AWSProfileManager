import React, { useState, useEffect } from "react";
import ActiveBadge from "./components/ActiveBadge";
import AccountList from "./components/AccountList";
import AccountForm from "./components/AccountForm";
import { Account, AccountFormData } from "./types";

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
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

  const loadData = async () => {
    try {
      const [accountsResult, activeResult, paths] = await Promise.all([
        window.electron.accounts.list(),
        window.electron.accounts.getActive(),
        window.electron.app.getDataPaths(),
      ]);

      if (accountsResult.success) {
        setAccounts(accountsResult.data ?? []);
      }

      if (activeResult.success) {
        setActiveProfile(activeResult.data ?? null);
      }

      setDataPaths(paths);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When user switches profile (or changes accounts) from the tray, refresh UI
  useEffect(() => {
    const unsubscribe =
      window.electron?.app?.onStateChanged?.(() => loadData());
    return () => unsubscribe?.();
  }, []);

  const handleAddAccount = () => {
    setFormMode("add");
    setEditingAccount(undefined);
    setShowForm(true);
  };

  const handleEditAccount = (account: Account) => {
    setFormMode("edit");
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleSaveAccount = async (data: AccountFormData) => {
    try {
      const result =
        formMode === "add"
          ? await (window as any).electron.accounts.add(data)
          : await (window as any).electron.accounts.edit(data);

      if (result.success) {
        setShowForm(false);
        await loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteAccount = async (profileName: string) => {
    try {
      const result = await window.electron.accounts.delete(profileName);

      if (result.success) {
        await loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSetActive = async (profileName: string) => {
    try {
      const result = await window.electron.accounts.setActive(profileName);

      if (result.success) {
        await loadData();

        if (result.verified && result.identity) {
          alert(
            `✓ Switched to: ${profileName}\n\nAccount: ${result.identity.account}\nARN: ${result.identity.arn}`,
          );
        } else {
          alert(`✓ Switched to: ${profileName}`);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  const activeAccount = accounts.find((a) => a.profileName === activeProfile);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.appTitle}>AWS Profile Manager</h1>
        <ActiveBadge
          activeProfile={activeProfile}
          displayName={activeAccount?.displayName}
        />
      </header>

      <main style={styles.main}>
        <AccountList
          accounts={accounts}
          activeProfile={activeProfile}
          onSetActive={handleSetActive}
          onEdit={handleEditAccount}
          onDelete={handleDeleteAccount}
          onAdd={handleAddAccount}
          onRefresh={handleRefresh}
        />
        {dataPaths && (
          <div style={styles.dataLocation}>
            <div style={styles.dataLocationTitle}>Data location</div>
            <div style={styles.dataLocationPath}>{dataPaths.appDataDir}</div>
            <button
              type="button"
              style={styles.openFolderButton}
              onClick={() => window.electron.app.openDataFolder()}
            >
              Open folder
            </button>
          </div>
        )}
      </main>

      {showForm && (
        <AccountForm
          mode={formMode}
          account={editingAccount}
          onSave={handleSaveAccount}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

const purple = {
  primary: "#7c3aed",
  primaryDark: "#6b21a8",
  bg: "#faf5ff",
  card: "#ffffff",
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
  } as React.CSSProperties,
  header: {
    background: purple.card,
    padding: "16px 24px",
    borderBottom: `1px solid ${purple.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,
  appTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#4c1d95",
  } as React.CSSProperties,
  main: {
    flex: 1,
    overflow: "auto",
  } as React.CSSProperties,
  dataLocation: {
    margin: "20px 24px",
    padding: "12px 16px",
    background: purple.card,
    borderRadius: "8px",
    border: `1px solid ${purple.border}`,
    fontSize: "12px",
    color: purple.muted,
  } as React.CSSProperties,
  dataLocationTitle: {
    fontWeight: 600,
    marginBottom: "4px",
    color: purple.text,
  } as React.CSSProperties,
  dataLocationPath: {
    fontFamily: "monospace",
    wordBreak: "break-all",
    marginBottom: "8px",
  } as React.CSSProperties,
  openFolderButton: {
    padding: "6px 12px",
    background: purple.bg,
    border: `1px solid ${purple.border}`,
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
    color: purple.primary,
    fontWeight: 600,
  } as React.CSSProperties,
  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    color: purple.muted,
  } as React.CSSProperties,
};

export default App;
