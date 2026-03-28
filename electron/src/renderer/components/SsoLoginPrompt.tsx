import React from "react";

export interface SsoLoginPromptProps {
  accountLabel: string;
  userCode: string;
  verificationUri?: string;
}

const purple = {
  primary: "#7c3aed",
  border: "#ede9fe",
  text: "#1f2937",
  muted: "#6b7280",
};

/**
 * In-app explanation for IAM Identity Center device authorization (RFC 8628).
 * The same userCode is embedded in verificationUriComplete when the browser opens.
 */
const SsoLoginPrompt: React.FC<SsoLoginPromptProps> = ({
  accountLabel,
  userCode,
  verificationUri,
}) => (
  <div style={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="sso-title">
    <div style={styles.card}>
      <h2 id="sso-title" style={styles.title}>
        Sign in with AWS
      </h2>
      <p style={styles.lead}>
        Complete sign-in for <strong>{accountLabel}</strong> in your browser. This uses IAM
        Identity Center&apos;s device verification flow: the code below must match the code on
        the AWS page before you confirm.
      </p>
      <div style={styles.codeBlock} aria-live="polite">
        <div style={styles.codeLabel}>Your verification code</div>
        <div style={styles.code}>{userCode}</div>
      </div>
      <p style={styles.hint}>
        A browser window should open to AWS. On the &quot;Authorization requested&quot; page,
        confirm this code matches, then choose <strong>Confirm and continue</strong>.
      </p>
      {verificationUri ? (
        <p style={styles.uriHint}>
          If no browser opened, open:{" "}
          <span style={styles.mono}>{verificationUri}</span>
        </p>
      ) : null}
      <p style={styles.waiting}>Waiting for you to finish in the browser…</p>
    </div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "24px",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    border: `1px solid ${purple.border}`,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    maxWidth: "440px",
    width: "100%",
    padding: "24px 28px",
  },
  title: {
    margin: "0 0 12px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#4c1d95",
  },
  lead: {
    margin: "0 0 16px",
    fontSize: "14px",
    lineHeight: 1.5,
    color: purple.text,
  },
  codeBlock: {
    background: "#faf5ff",
    border: `1px solid ${purple.border}`,
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
    textAlign: "center",
  },
  codeLabel: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: purple.muted,
    marginBottom: "8px",
  },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#5b21b6",
    userSelect: "all",
  },
  hint: {
    margin: "0 0 12px",
    fontSize: "13px",
    lineHeight: 1.55,
    color: purple.text,
  },
  uriHint: {
    margin: "0 0 16px",
    fontSize: "12px",
    lineHeight: 1.5,
    color: purple.muted,
    wordBreak: "break-all",
  },
  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "11px",
  },
  waiting: {
    margin: 0,
    fontSize: "13px",
    color: purple.primary,
    fontWeight: 600,
  },
};

export default SsoLoginPrompt;
