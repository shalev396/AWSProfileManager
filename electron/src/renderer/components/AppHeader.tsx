import React from "react";

export interface AppHeaderProps {
  iconDataUrl: string | null;
  title: string;
  subtitle: string;
  activeProfileLabel: string | null;
}

const purple = {
  primary: "#7c3aed",
  border: "#ede9fe",
  text: "#1f2937",
  muted: "#6b7280",
};

const AppHeader: React.FC<AppHeaderProps> = ({
  iconDataUrl,
  title,
  subtitle,
  activeProfileLabel,
}) => {
  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        {iconDataUrl ? (
          <img src={iconDataUrl} alt="" style={styles.logo} width={40} height={40} />
        ) : (
          <div style={styles.logoFallback} aria-hidden />
        )}
        <div style={styles.titles}>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>
      </div>
      <div style={styles.pill} title={activeProfileLabel ?? "No profile selected"}>
        <span
          style={{
            ...styles.pillDot,
            background: activeProfileLabel ? "#22c55e" : "#d1d5db",
          }}
          aria-hidden
        />
        <span style={styles.pillText}>
          Active CLI profile:{" "}
          <strong style={styles.pillStrong}>
            {activeProfileLabel ?? "—"}
          </strong>
        </span>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "#faf5ff",
    padding: "14px 20px 12px",
    borderBottom: `1px solid ${purple.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
    flex: "1 1 220px",
  },
  logo: {
    flexShrink: 0,
    borderRadius: "10px",
    objectFit: "contain",
    background: "#fff",
    border: `1px solid ${purple.border}`,
  },
  logoFallback: {
    width: 40,
    height: 40,
    borderRadius: "10px",
    flexShrink: 0,
    background: `linear-gradient(145deg, ${purple.primary} 0%, #4c1d95 100%)`,
    border: `1px solid ${purple.border}`,
  },
  titles: { minWidth: 0 },
  title: {
    margin: 0,
    fontSize: "19px",
    fontWeight: 700,
    color: "#4c1d95",
    lineHeight: 1.25,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "12px",
    lineHeight: 1.45,
    color: purple.muted,
    maxWidth: "min(560px, 100%)",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    background: "#fff",
    border: `1px solid ${purple.border}`,
    borderRadius: "999px",
    fontSize: "12px",
    color: purple.text,
    boxShadow: "0 1px 2px rgba(76, 29, 149, 0.06)",
    maxWidth: "100%",
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  pillText: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  pillStrong: { color: "#4c1d95", fontWeight: 700 },
};

export default AppHeader;
