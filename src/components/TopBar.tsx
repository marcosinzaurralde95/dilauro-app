// ─────────────────────────────────────────────────────────────
// AION — Mobile Top Bar
// ─────────────────────────────────────────────────────────────
import { NAV } from "../config/constants";
import { T } from "../config/theme";

interface TopBarProps {
  onMenuOpen: () => void;
  mod: string;
}

export function TopBar({ onMenuOpen, mod }: TopBarProps) {
  const label = NAV.find((n) => n.id === mod)?.label || "";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "rgba(7,7,16,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <button
        onClick={onMenuOpen}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${T.border}`,
          borderRadius: "8px",
          width: "34px",
          height: "34px",
          cursor: "pointer",
          color: "#94A3B8",
          fontSize: "17px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ☰
      </button>
      <div
        style={{
          fontSize: "15px",
          fontWeight: "900",
          background: "linear-gradient(135deg,#7C3AED,#06B6D4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        AION
      </div>
      <div style={{ fontSize: "12px", color: "#334155", marginLeft: "2px" }}>
        · {label}
      </div>
    </div>
  );
}
