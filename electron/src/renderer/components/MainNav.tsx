import React from "react";

export type MainTab = "profiles" | "settings";

const TABS: { id: MainTab; label: string }[] = [
  { id: "profiles", label: "Profiles" },
  { id: "settings", label: "Settings" },
];

const purple = {
  primary: "#7c3aed",
  primaryDark: "#5b21b6",
  bg: "#faf5ff",
  border: "#e9d5ff",
  muted: "#6b7280",
  tabIdleBg: "#f3e8ff",
};

export interface MainNavProps {
  value: MainTab;
  onChange: (tab: MainTab) => void;
}

const MainNav: React.FC<MainNavProps> = ({ value, onChange }) => {
  return (
    <nav style={styles.nav} aria-label="Main">
      <div style={styles.inner}>
        <div style={styles.segment} role="tablist">
          {TABS.map((t) => {
            const active = t.id === value;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                style={{
                  ...styles.tab,
                  ...(active ? styles.tabActive : {}),
                }}
                onClick={() => { onChange(t.id); }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {
    background: `linear-gradient(180deg, ${purple.bg} 0%, #f5f3ff 100%)`,
    borderBottom: `1px solid ${purple.border}`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
  },
  inner: {
    padding: "10px 16px 12px",
  },
  segment: {
    display: "inline-flex",
    flexWrap: "wrap",
    gap: 6,
    padding: 4,
    borderRadius: 12,
    background: "rgba(124, 58, 237, 0.08)",
    border: `1px solid ${purple.border}`,
    boxShadow: "0 1px 2px rgba(91, 33, 182, 0.06)",
  },
  tab: {
    border: "none",
    background: purple.tabIdleBg,
    color: purple.muted,
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: 9,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
    transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
  },
  tabActive: {
    background: "#fff",
    color: purple.primaryDark,
    boxShadow:
      "0 0 0 1px rgba(124, 58, 237, 0.35), 0 2px 8px rgba(124, 58, 237, 0.12)",
  },
};

export default MainNav;
