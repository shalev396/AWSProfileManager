import React, { useState, useEffect } from "react";
import { Account, AccountFormData } from "../types";
import { AWS_REGIONS } from "../awsRegions";

interface AccountFormProps {
  mode: "add" | "edit";
  account?: Account;
  onSave: (data: AccountFormData) => void;
  onCancel: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({
  mode,
  account,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    profileName: account?.profileName || "",
    accessKeyId: "",
    secretAccessKey: "",
    region: account?.region || "il-central-1",
    output: account?.output || "json",
    logoPath: account?.logoPath || "",
    displayName: account?.displayName || "",
  });

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  // In edit mode, load access key for display (never load secret)
  useEffect(() => {
    if (mode === "edit" && account?.profileName) {
      window.electron.accounts.getAccessKey(account.profileName).then((res) => {
        if (res.success && res.data?.accessKeyId) {
          setFormData((prev) => ({
            ...prev,
            accessKeyId: res.data!.accessKeyId,
          }));
        }
      });
    }
  }, [mode, account?.profileName]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.profileName) {
      alert("Profile name is required");
      return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(formData.profileName)) {
      alert(
        "Profile name can only contain letters, numbers, hyphens, and underscores",
      );
      return;
    }

    if (mode === "add") {
      if (!formData.accessKeyId || !formData.secretAccessKey) {
        alert("Access Key ID and Secret Access Key are required");
        return;
      }
    }
    if (
      mode === "edit" &&
      formData.secretAccessKey.trim() !== "" &&
      formData.secretAccessKey.length < 40
    ) {
      alert("Secret Access Key must be at least 40 characters");
      return;
    }

    onSave(formData);
  };

  const handleVerify = async () => {
    if (!formData.profileName) {
      alert("Please enter a profile name first");
      return;
    }

    setVerifying(true);
    setVerifyResult(null);

    try {
      const result = await window.electron.accounts.verify(
        formData.profileName,
      );

      if (result.success) {
        setVerifyResult(
          `✓ Verified: ${result.identity.arn} (Account: ${result.identity.account})`,
        );
      } else {
        setVerifyResult(`✗ Error: ${result.error}`);
      }
    } catch (error: any) {
      setVerifyResult(`✗ Error: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectLogo = async () => {
    const result = await window.electron.dialog.selectImageFile();
    if (!result.canceled && result.filePath) {
      setFormData((prev) => ({ ...prev, logoPath: result.filePath }));
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {mode === "add" ? "Add Account" : "Edit Account"}
          </h2>
          <button style={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Profile Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="profileName"
              value={formData.profileName}
              onChange={handleChange}
              style={styles.input}
              disabled={mode === "edit"}
              placeholder="e.g., production, staging, dev"
            />
            <small style={styles.hint}>
              Letters, numbers, hyphens, and underscores only
            </small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              style={styles.input}
              placeholder="Friendly name (optional)"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Access Key ID{" "}
              {mode === "add" && <span style={styles.required}>*</span>}
            </label>
            <input
              type="text"
              name="accessKeyId"
              value={formData.accessKeyId}
              onChange={handleChange}
              style={styles.input}
              placeholder="AKIA..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Secret Access Key{" "}
              {mode === "add" && <span style={styles.required}>*</span>}
            </label>
            <input
              type="password"
              name="secretAccessKey"
              value={formData.secretAccessKey}
              onChange={handleChange}
              style={styles.input}
              placeholder={
                mode === "edit"
                  ? "Enter new to change (leave blank to keep current)"
                  : "••••••••••••••••••••"
              }
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Region</label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                style={styles.input}
              >
                {AWS_REGIONS.some((r) => r.code === formData.region) ? null : (
                  <option value={formData.region}>{formData.region}</option>
                )}
                {AWS_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Output</label>
              <select
                name="output"
                value={formData.output}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="json">json</option>
                <option value="text">text</option>
                <option value="table">table</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Logo</label>
            <div style={styles.fileInput}>
              <input
                type="text"
                name="logoPath"
                value={formData.logoPath}
                onChange={handleChange}
                style={styles.input}
                placeholder="Path to logo PNG file"
              />
              <button
                type="button"
                style={styles.browseButton}
                onClick={handleSelectLogo}
              >
                Browse
              </button>
            </div>
          </div>

          {verifyResult && (
            <div
              style={{
                ...styles.verifyResult,
                ...(verifyResult.startsWith("✓")
                  ? styles.verifySuccess
                  : styles.verifyError),
              }}
            >
              {verifyResult}
            </div>
          )}

          <div style={styles.actions}>
            {mode === "edit" && (
              <button
                type="button"
                style={styles.verifyButton}
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Test Connection"}
              </button>
            )}
            <div style={styles.actionButtons}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={onCancel}
              >
                Cancel
              </button>
              <button type="submit" style={styles.saveButton}>
                {mode === "add" ? "Add Account" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  } as React.CSSProperties,
  modal: {
    background: "#fff",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 25px -5px rgba(124, 58, 237, 0.15), 0 8px 10px -6px rgba(124, 58, 237, 0.1)",
    border: "1px solid #ede9fe",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #ede9fe",
  } as React.CSSProperties,
  title: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#4c1d95",
  } as React.CSSProperties,
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "32px",
    color: "#999",
    cursor: "pointer",
    padding: 0,
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,
  form: {
    padding: "24px",
  } as React.CSSProperties,
  formGroup: {
    marginBottom: "20px",
  } as React.CSSProperties,
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: 600,
    color: "#4c1d95",
    marginBottom: "8px",
  } as React.CSSProperties,
  required: {
    color: "#dc2626",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #ede9fe",
    borderRadius: "8px",
    outline: "none",
  } as React.CSSProperties,
  hint: {
    display: "block",
    marginTop: "4px",
    fontSize: "12px",
    color: "#6b7280",
  } as React.CSSProperties,
  fileInput: {
    display: "flex",
    gap: "8px",
  } as React.CSSProperties,
  browseButton: {
    padding: "10px 16px",
    background: "#faf5ff",
    color: "#7c3aed",
    border: "1px solid #ede9fe",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  verifyResult: {
    padding: "12px",
    borderRadius: "4px",
    fontSize: "13px",
    marginBottom: "20px",
  } as React.CSSProperties,
  verifySuccess: {
    background: "#ede9fe",
    color: "#5b21b6",
    border: "1px solid #a78bfa",
  } as React.CSSProperties,
  verifyError: {
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
  } as React.CSSProperties,
  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #ede9fe",
  } as React.CSSProperties,
  actionButtons: {
    display: "flex",
    gap: "12px",
  } as React.CSSProperties,
  verifyButton: {
    padding: "10px 20px",
    background: "#faf5ff",
    color: "#7c3aed",
    border: "1px solid #a78bfa",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  cancelButton: {
    padding: "10px 20px",
    background: "#faf5ff",
    color: "#4c1d95",
    border: "1px solid #ede9fe",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  saveButton: {
    padding: "10px 20px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
};

export default AccountForm;
