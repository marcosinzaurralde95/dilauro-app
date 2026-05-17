// ─────────────────────────────────────────────────────────────
// AION — Sidebar Navigation
// ─────────────────────────────────────────────────────────────
import { NAV } from "../config/constants";
import { T } from "../config/theme";

interface SidebarProps {
  active: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobile: boolean;
}

export function Sidebar({
  active,
  onSelect,
  collapsed,
  setCollapsed,
  mobile,
}: SidebarProps) {
  const w = collapsed ? (mobile ? 0 : 58) : 224;

  return (
    <>
      {/* Mobile backdrop */}
      {mobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 40,
          }}
        />
      )}

      <div
        style={{
          width: mobile ? (collapsed ? 0 : 244) : w,
          position: mobile ? "fixed" : "relative",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          background: "rgba(5,5,14,0.85)",
          backdropFilter: "blur(20px)",
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width 0.22s ease",
          overflow: "hidden",
          height: mobile ? "100vh" : "auto",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed && !mobile ? "18px 0" : "20px 16px 16px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent:
              collapsed && !mobile ? "center" : "space-between",
          }}
        >
          {(!collapsed || mobile) && (
            <div>
              <div
                style={{
                  fontSize: "19px",
                  fontWeight: "900",
                  background:
                    "linear-gradient(135deg,#7C3AED,#06B6D4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                }}
              >
                AION
              </div>
              <div
                style={{
                  fontSize: "7px",
                  color: "#334155",
                  marginTop: "1px",
                  letterSpacing: "3.5px",
                  fontWeight: "700",
                }}
              >
                AI BUSINESS OS
              </div>
            </div>
          )}
          {collapsed && !mobile && (
            <div
              style={{
                fontSize: "18px",
                fontWeight: "900",
                background:
                  "linear-gradient(135deg,#7C3AED,#06B6D4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ⚡
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${T.border}`,
              borderRadius: "7px",
              width: "28px",
              height: "28px",
              cursor: "pointer",
              color: "#475569",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            padding: collapsed && !mobile ? "10px 5px" : "10px 7px",
            overflowY: "auto",
          }}
        >
          {NAV.map((n) => {
            const isActive = active === n.id;
            return (
              <button
                key={n.id}
                onClick={() => {
                  onSelect(n.id);
                  if (mobile) setCollapsed(true);
                }}
                title={n.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding:
                    collapsed && !mobile ? "11px 0" : "9px 11px",
                  justifyContent:
                    collapsed && !mobile ? "center" : "flex-start",
                  marginBottom: "3px",
                  background: isActive ? T.accentLo : "transparent",
                  border: isActive
                    ? "1px solid rgba(124,58,237,0.28)"
                    : "1px solid transparent",
                  borderRadius: "9px",
                  cursor: "pointer",
                  color: isActive ? "#A78BFA" : T.muted,
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 400,
                  textAlign: "left",
                  transition: "all 0.14s",
                }}
              >
                <span style={{ fontSize: "15px", flexShrink: 0 }}>
                  {n.icon}
                </span>
                {(!collapsed || mobile) && <span>{n.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {(!collapsed || mobile) && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginBottom: "5px",
              }}
            >
              <div
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: T.green,
                  boxShadow: `0 0 6px ${T.green}`,
                }}
              />
              <div
                style={{
                  fontSize: "9px",
                  color: "#334155",
                  fontWeight: "600",
                  letterSpacing: "1px",
                }}
              >
                PROXY ACTIVO
              </div>
            </div>
            <div
              style={{
                fontSize: "8px",
                color: "#1E293B",
                letterSpacing: "0.5px",
              }}
            >
              AION v3.0 · INZATECH © 2026
            </div>
          </div>
        )}
      </div>
    </>
  );
}
