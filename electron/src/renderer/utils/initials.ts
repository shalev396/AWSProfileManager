export function getAccountInitials(displayName: string, fallback: string): string {
  const s = (displayName || fallback).trim();
  if (!s) {return "?";}
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (first !== undefined && last !== undefined) {
      const a = first[0];
      const b = last[0];
      if (a !== undefined && b !== undefined) {
        return (a + b).toUpperCase();
      }
    }
  }
  return s.slice(0, 2).toUpperCase();
}
