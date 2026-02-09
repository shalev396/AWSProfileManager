import React, { useState, useEffect } from "react";
import { Account } from "../types";

const LogoImage: React.FC<{
  logoPath: string;
  alt: string;
  style: React.CSSProperties;
}> = ({ logoPath, alt, style }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    window.electron.app.getLogoDataUrl(logoPath).then((url) => {
      if (!cancelled && url) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [logoPath]);
  if (!dataUrl) return null;
  return <img src={dataUrl} alt={alt} style={style} />;
};

interface AccountListProps {
  accounts: Account[];
  activeProfile: string | null;
  onSetActive: (profileName: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (profileName: string) => void;
  onAdd: () => void;
  onRefresh: () => void;
}

const AccountList: React.FC<AccountListProps> = ({
  accounts,
  activeProfile,
  onSetActive,
  onEdit,
  onDelete,
  onAdd,
  onRefresh,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <h2 style={styles.title}>AWS Accounts</h2>
        <div style={styles.buttons}>
          <button style={styles.buttonSecondary} onClick={onRefresh}>
            Refresh
          </button>
          <button style={styles.buttonPrimary} onClick={onAdd}>
            + Add Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No accounts configured</p>
          <p style={styles.emptySubtext}>Click "Add Account" to get started</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {accounts.map((account) => {
            const isActive = account.profileName === activeProfile;
            return (
              <div
                key={account.profileName}
                style={{
                  ...styles.card,
                  ...(isActive ? styles.cardActive : {}),
                }}
              >
                {account.logoPath && (
                  <LogoImage
                    logoPath={account.logoPath}
                    alt={account.displayName || account.profileName}
                    style={styles.logo}
                  />
                )}
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>
                    {account.displayName || account.profileName}
                  </h3>
                  <p style={styles.cardSubtitle}>{account.profileName}</p>
                  {account.region && (
                    <p style={styles.cardDetail}>Region: {account.region}</p>
                  )}
                  {isActive && <span style={styles.activeBadge}>ACTIVE</span>}
                </div>
                <div style={styles.cardActions}>
                  {!isActive && (
                    <button
                      style={styles.actionButton}
                      onClick={() => onSetActive(account.profileName)}
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    style={styles.actionButtonSecondary}
                    onClick={() => onEdit(account)}
                  >
                    Edit
                  </button>
                  <button
                    style={styles.actionButtonDanger}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete profile "${account.profileName}"?`,
                        )
                      ) {
                        onDelete(account.profileName);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const purple = {
  primary: "#7c3aed",
  primaryDark: "#6b21a8",
  bg: "#faf5ff",
  border: "#ede9fe",
  text: "#1f2937",
  muted: "#6b7280",
};

const styles = {
  container: {
    padding: "20px",
  } as React.CSSProperties,
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  } as React.CSSProperties,
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#4c1d95",
  } as React.CSSProperties,
  buttons: {
    display: "flex",
    gap: "12px",
  } as React.CSSProperties,
  buttonPrimary: {
    padding: "10px 20px",
    background: purple.primary,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  buttonSecondary: {
    padding: "10px 20px",
    background: "#fff",
    color: purple.primary,
    border: `1px solid ${purple.border}`,
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#fff",
    borderRadius: "12px",
    border: `1px solid ${purple.border}`,
  } as React.CSSProperties,
  emptyText: {
    fontSize: "18px",
    fontWeight: 600,
    color: purple.muted,
    marginBottom: "8px",
  } as React.CSSProperties,
  emptySubtext: {
    fontSize: "14px",
    color: "#9ca3af",
  } as React.CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  } as React.CSSProperties,
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    border: `1px solid ${purple.border}`,
    transition: "transform 0.2s, box-shadow 0.2s",
  } as React.CSSProperties,
  cardActive: {
    borderLeft: "4px solid " + purple.primary,
    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)",
  } as React.CSSProperties,
  logo: {
    width: "48px",
    height: "48px",
    objectFit: "contain",
    marginBottom: "12px",
  } as React.CSSProperties,
  cardContent: {
    marginBottom: "16px",
  } as React.CSSProperties,
  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: purple.text,
    marginBottom: "4px",
  } as React.CSSProperties,
  cardSubtitle: {
    fontSize: "14px",
    color: purple.muted,
    marginBottom: "8px",
  } as React.CSSProperties,
  cardDetail: {
    fontSize: "12px",
    color: "#9ca3af",
  } as React.CSSProperties,
  activeBadge: {
    display: "inline-block",
    marginTop: "8px",
    padding: "4px 12px",
    background: purple.primary,
    color: "#fff",
    fontSize: "11px",
    fontWeight: 700,
    borderRadius: "6px",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  cardActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  } as React.CSSProperties,
  actionButton: {
    flex: 1,
    padding: "8px 16px",
    background: purple.primary,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  actionButtonSecondary: {
    flex: 1,
    padding: "8px 16px",
    background: purple.bg,
    color: purple.text,
    border: `1px solid ${purple.border}`,
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  actionButtonDanger: {
    flex: 1,
    padding: "8px 16px",
    background: "#fff",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
};

export default AccountList;
