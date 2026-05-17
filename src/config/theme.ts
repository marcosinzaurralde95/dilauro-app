// ─────────────────────────────────────────────────────────────
// AION AI Business OS — Design Tokens & Style Helpers
// ─────────────────────────────────────────────────────────────
import type { CSSProperties } from "react";

export const T = {
  bg: "#070710",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.07)",
  text: "#E2E8F0",
  muted: "#475569",
  faint: "#1E293B",
  accent: "#7C3AED",
  accentLo: "rgba(124,58,237,0.15)",
  cyan: "#06B6D4",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
} as const;

export const glass: CSSProperties = {
  background: T.surface,
  backdropFilter: "blur(14px)",
  border: `1px solid ${T.border}`,
  borderRadius: "16px",
};

export const btn = (color: string = T.accent, outline = false): CSSProperties => ({
  background: outline ? "transparent" : color,
  border: `1px solid ${color}`,
  color: outline ? color : "#fff",
  padding: "8px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
  transition: "all 0.18s ease",
  whiteSpace: "nowrap",
  outline: "none",
});

export const inp: CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  color: T.text,
  padding: "10px 14px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

export const tag = (color: string): CSSProperties => ({
  background: `${color}18`,
  color,
  border: `1px solid ${color}35`,
  padding: "2px 10px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.3px",
});

/** CSS keyframes — inject once in App */
export const GLOBAL_KEYFRAMES = `
  @keyframes dot {
    0%, 100% { opacity: .2; transform: scale(.7) }
    50% { opacity: 1; transform: scale(1.2) }
  }
  @keyframes blink {
    0%, 100% { opacity: 1 }
    50% { opacity: 0 }
  }
  @keyframes slideIn {
    from { transform: translateX(20px); opacity: 0 }
    to { transform: translateX(0); opacity: 1 }
  }
`;
