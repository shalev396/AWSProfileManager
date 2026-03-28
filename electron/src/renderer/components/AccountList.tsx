import React, { useState, useEffect } from "react";
import type { Account } from "../types";
import { getAccountInitials } from "../utils/initials";
import { getSsoSessionStatus, getSsoUrgency } from "../utils/ssoExpiryLabel";

const LogoImage: React.FC<{
  logoPath: string;
  alt: string;
  style: React.CSSProperties;
}> = ({ logoPath, alt, style }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void window.electron.app.getLogoDataUrl(logoPath).then((url) => {
      if (!cancelled && url) {setDataUrl(url);}
    });
    return () => {
      cancelled = true;
    };
  }, [logoPath]);
  if (!dataUrl) {return null;}
  return <img src={dataUrl} alt={alt} style={style} />;
};

interface AccountListProps {
  accounts: Account[];
  activeAccountId: string | null;
  onSetActive: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onAdd: () => void;
  onRefresh: () => void;
  onSsoLogin: (accountId: string) => void;
}

const purple = {
  primary: "#7c3aed",
  bg: "#faf5ff",
  border: "#ede9fe",
  text: "#1f2937",
  muted: "#6b7280",
};

const AccountList: React.FC<AccountListProps> = ({
  accounts,
  activeAccountId,
  onSetActive,
  onEdit,
  onDelete,
  onAdd,
  onRefresh,
  onSsoLogin,
}) => {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const hasSso = accounts.some((a) => a.authType === "sso");

  useEffect(() => {
    setNowTick(Date.now());
  }, [accounts]);

  useEffect(() => {
    if (!hasSso) {return;}
    const id = window.setInterval(() => { setNowTick(Date.now()); }, 60_000);
    return () => { window.clearInterval(id); };
  }, [hasSso]);

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarSpacer} aria-hidden />
        <div style={styles.buttons}>
          <button
            type="button"
            style={styles.buttonSecondary}
            onClick={onRefresh}
          >
            Refresh
          </button>
          <button type="button" style={styles.buttonPrimary} onClick={onAdd}>
            + Add account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No accounts here</p>
          <p style={styles.emptySubtext}>
            Use &quot;Add account&quot; or pick another tab.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {accounts.map((account) => {
            const isActive = account.id === activeAccountId;
            const display = account.name || account.profileName;
            const initials = getAccountInitials(
              account.name,
              account.profileName,
            );
            const urgency =
              account.authType === "sso"
                ? getSsoUrgency(account.expiresAt, nowTick)
                : null;
            const ssoStatus =
              account.authType === "sso"
                ? getSsoSessionStatus(account.expiresAt, nowTick)
                : null;

            return (
              <div
                key={account.id}
                style={{
                  ...styles.card,
                  ...(isActive ? styles.cardActive : {}),
                }}
              >
                {isActive ? (
                  <div style={styles.activeRibbon} aria-hidden>
                    Active
                  </div>
                ) : null}

                <div
                  style={{
                    ...styles.cardTop,
                    ...(isActive ? { paddingRight: 76 } : {}),
                  }}
                >
                  <div style={styles.avatarWrap}>
                    {account.logoPath ? (
                      <LogoImage
                        logoPath={account.logoPath}
                        alt={display}
                        style={styles.avatarImg ?? {}}
                      />
                    ) : (
                      <div style={styles.avatarFallback}>{initials}</div>
                    )}
                  </div>
                  <div style={styles.cardHeadText}>
                    <h3 style={styles.cardTitle}>{display}</h3>
                    <p style={styles.profileId}>{account.profileName}</p>
                    <div style={styles.badgeRow}>
                      {account.region ? (
                        <span style={styles.badgeRegion}>
                          🌐 {account.region}
                        </span>
                      ) : null}
                      <span
                        style={
                          account.authType === "sso"
                            ? styles.badgeSso
                            : styles.badgeIam
                        }
                      >
                        {account.authType === "sso" ? "SSO" : "IAM keys"}
                      </span>
                    </div>
                  </div>
                </div>

                {account.authType === "iam" ? (
                  <div style={styles.iamStrip}>
                    Uses access keys stored in this app (encrypted) and written
                    to your AWS credentials file when active.
                  </div>
                ) : null}

                {account.authType === "sso" && ssoStatus ? (
                  <div
                    style={{
                      ...styles.ssoStrip,
                      ...(urgency === "expired" || urgency === "missing"
                        ? styles.ssoStripBad
                        : {}),
                      ...(urgency === "soon" ? styles.ssoStripSoon : {}),
                      ...(urgency === "ok" ? styles.ssoStripOk : {}),
                    }}
                  >
                    <div style={styles.ssoPrimary}>{ssoStatus.primary}</div>
                    {ssoStatus.hint ? (
                      <div style={styles.ssoHint}>{ssoStatus.hint}</div>
                    ) : null}
                  </div>
                ) : null}

                <div style={styles.actions}>
                  {!isActive ? (
                    <button
                      type="button"
                      style={styles.btnPrimaryWide}
                      onClick={() => { onSetActive(account); }}
                    >
                      Set active
                    </button>
                  ) : (
                    <div style={styles.activeHint}>
                      This is the active CLI profile.
                    </div>
                  )}
                  {account.authType === "sso" ? (
                    urgency === "expired" ||
                    urgency === "missing" ||
                    urgency === "soon" ? (
                      <button
                        type="button"
                        style={styles.btnSsoWide}
                        onClick={() => { onSsoLogin(account.id); }}
                      >
                        Re-login
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={styles.btnSsoOutline}
                        onClick={() => { onSsoLogin(account.id); }}
                      >
                        SSO login
                      </button>
                    )
                  ) : null}
                  <div style={styles.rowActions}>
                    <button
                      type="button"
                      style={styles.btnSecondary}
                      onClick={() => { onEdit(account); }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={styles.btnDanger}
                      title="Delete account"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete profile "${account.profileName}"?`,
                          )
                        ) {
                          onDelete(account.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "16px 20px 24px",
  },
  toolbar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: "18px",
    gap: "12px",
  },
  toolbarSpacer: { flex: 1 },
  buttons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  buttonPrimary: {
    padding: "10px 18px",
    background: purple.primary,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
  },
  buttonSecondary: {
    padding: "10px 18px",
    background: "#fff",
    color: purple.primary,
    border: `1px solid ${purple.border}`,
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  empty: {
    textAlign: "center",
    padding: "48px 20px",
    background: purple.bg,
    borderRadius: "12px",
    border: `1px dashed ${purple.border}`,
  },
  emptyText: {
    fontSize: "16px",
    fontWeight: 600,
    color: purple.muted,
    marginBottom: "6px",
  },
  emptySubtext: {
    fontSize: "13px",
    color: "#9ca3af",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
    gap: "18px",
  },
  card: {
    position: "relative",
    background: "#fff",
    borderRadius: "14px",
    padding: "18px 18px 16px",
    border: `1px solid ${purple.border}`,
    boxShadow: "0 4px 20px rgba(76, 29, 149, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflow: "hidden",
  },
  cardActive: {
    border: `2px solid ${purple.primary}`,
    boxShadow: "0 8px 28px rgba(124, 58, 237, 0.18)",
  },
  activeRibbon: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    background: "#22c55e",
    color: "#fff",
    textTransform: "uppercase",
  },
  cardTop: {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: "12px",
    overflow: "hidden",
    flexShrink: 0,
    background: purple.bg,
    border: `1px solid ${purple.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: 800,
    color: "#5b21b6",
    background: `linear-gradient(145deg, ${purple.bg} 0%, #e9d5ff 100%)`,
  },
  cardHeadText: { minWidth: 0, flex: 1 },
  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 700,
    color: purple.text,
    lineHeight: 1.25,
  },
  profileId: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: purple.muted,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "8px",
  },
  badgeRegion: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#f3f4f6",
    color: "#4b5563",
  },
  badgeIam: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#f3f4f6",
    color: "#4b5563",
  },
  badgeSso: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  iamStrip: {
    fontSize: "12px",
    lineHeight: 1.45,
    color: "#64748b",
    padding: "10px 12px",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  ssoStrip: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  ssoStripBad: {
    background: "#fef2f2",
    borderColor: "#fecaca",
  },
  ssoStripSoon: {
    background: "#fffbeb",
    borderColor: "#fde68a",
  },
  ssoStripOk: {
    background: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  ssoPrimary: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    lineHeight: 1.35,
  },
  ssoHint: {
    marginTop: "4px",
    fontSize: "11px",
    color: "#64748b",
    lineHeight: 1.4,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  btnPrimaryWide: {
    width: "100%",
    padding: "10px 14px",
    background: purple.primary,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSsoWide: {
    width: "100%",
    padding: "10px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSsoOutline: {
    width: "100%",
    padding: "8px 14px",
    background: "#fff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  activeHint: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#15803d",
    textAlign: "center",
    padding: "8px 0 4px",
  },
  rowActions: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  btnSecondary: {
    flex: 1,
    padding: "8px 12px",
    background: purple.bg,
    color: purple.text,
    border: `1px solid ${purple.border}`,
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDanger: {
    flex: 1,
    padding: "8px 12px",
    background: "#fff",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default AccountList;
