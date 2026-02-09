import React from 'react';

interface ActiveBadgeProps {
  activeProfile: string | null;
  displayName?: string;
}

const ActiveBadge: React.FC<ActiveBadgeProps> = ({ activeProfile, displayName }) => {
  if (!activeProfile) {
    return (
      <div style={styles.badge}>
        <span style={styles.label}>Active:</span>
        <span style={styles.valueInactive}>None</span>
      </div>
    );
  }

  return (
    <div style={styles.badge}>
      <span style={styles.label}>Active:</span>
      <span style={styles.valueActive}>{displayName || activeProfile}</span>
    </div>
  );
};

const styles = {
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#faf5ff',
    borderRadius: '8px',
    border: '1px solid #ede9fe',
  } as React.CSSProperties,
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
  } as React.CSSProperties,
  valueActive: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b21a8',
    background: '#ede9fe',
    padding: '4px 12px',
    borderRadius: '6px',
  } as React.CSSProperties,
  valueInactive: {
    fontSize: '14px',
    color: '#9ca3af',
  } as React.CSSProperties,
};

export default ActiveBadge;
