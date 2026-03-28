import React from "react";

const purple = {
  primary: "#7c3aed",
  bg: "#faf5ff",
  border: "#ede9fe",
  text: "#1f2937",
  muted: "#6b7280",
};

export interface SettingsPanelProps {
  appDataDir: string;
  awsConfig: string;
  launchAtLogin: boolean;
  launchAtLoginOsApplies: boolean;
  onOpenDataFolder: () => void;
  onLaunchAtLoginChange: (enabled: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  appDataDir,
  awsConfig,
  launchAtLogin,
  launchAtLoginOsApplies,
  onOpenDataFolder,
  onLaunchAtLoginChange,
}) => {
  return (
    <div style={styles.wrap}>
      <h2 style={styles.heading}>Settings</h2>
      <ul style={styles.list}>
        <li style={styles.row}>
          <div style={styles.rowBody}>
            <div style={styles.rowTitle}>Local app data</div>
            <p style={styles.rowDesc}>
              Accounts, logos, and encrypted secrets live here. AWS config paths are
              updated when you switch profiles.
            </p>
            <code style={styles.path} title={appDataDir}>
              {appDataDir}
            </code>
            <p style={styles.awsHint} title={awsConfig}>
              AWS config: {awsConfig}
            </p>
          </div>
          <button type="button" style={styles.primaryBtn} onClick={onOpenDataFolder}>
            Open folder
          </button>
        </li>
        <li style={styles.row}>
          <div style={styles.rowBody}>
            <div style={styles.rowTitle}>Open at login</div>
            <p style={styles.rowDesc}>
              Start the app when you sign in to Windows (runs in the tray where
              supported).
            </p>
            {!launchAtLoginOsApplies ? (
              <p style={styles.devHint}>
                Development build: preference is saved, but only the installed app
                registers with the OS for startup.
              </p>
            ) : null}
          </div>
          <label style={styles.toggleWrap}>
            <input
              type="checkbox"
              checked={launchAtLogin}
              onChange={(e) => { onLaunchAtLoginChange(e.target.checked); }}
            />
            <span style={styles.toggleLabel}>Enabled</span>
          </label>
        </li>
      </ul>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: "20px 20px 28px",
    maxWidth: 720,
  },
  heading: {
    margin: "0 0 16px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#4c1d95",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "18px 18px",
    background: purple.bg,
    border: `1px solid ${purple.border}`,
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(76, 29, 149, 0.04)",
  },
  rowBody: {
    flex: "1 1 240px",
    minWidth: 0,
  },
  rowTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: purple.text,
    marginBottom: "6px",
  },
  rowDesc: {
    margin: "0 0 8px",
    fontSize: "13px",
    lineHeight: 1.45,
    color: purple.muted,
  },
  path: {
    display: "block",
    fontSize: "11px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    color: purple.text,
    background: "#fff",
    padding: "8px 10px",
    borderRadius: "8px",
    border: `1px solid ${purple.border}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  awsHint: {
    margin: "8px 0 0",
    fontSize: "11px",
    color: "#9ca3af",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  devHint: {
    margin: "8px 0 0",
    fontSize: "12px",
    color: "#64748b",
    lineHeight: 1.4,
  },
  primaryBtn: {
    flexShrink: 0,
    padding: "10px 18px",
    background: purple.primary,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  toggleWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: 600,
    color: purple.text,
    cursor: "pointer",
    userSelect: "none",
    paddingTop: "2px",
  },
  toggleLabel: { fontWeight: 600 },
};

export default SettingsPanel;
