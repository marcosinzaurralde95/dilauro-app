// ─────────────────────────────────────────────────────────────
// AION — Command Center Dashboard
// ─────────────────────────────────────────────────────────────
import type { Project } from "../types";
import { T, glass, btn, tag } from "../config/theme";

interface DashboardProps {
  projects: Project[];
  onNavigate: (mod: string) => void;
}

export function Dashboard({ projects, onNavigate }: DashboardProps) {
  const stats = [
    { label: "Proyectos", value: projects.length, color: T.accent },
    {
      label: "Activos",
      value: projects.filter((p) => p.status === "active").length,
      color: T.green,
    },
    { label: "Integrac.", value: 7, color: T.cyan },
    { label: "Módulos IA", value: 6, color: T.amber },
  ];

  const actions = [
    {
      label: "🧠 AI Co-Pilot",
      sub: "6 modos · Streaming real",
      mod: "copilot",
      color: T.accent,
    },
    {
      label: "🚀 Nuevo Proyecto",
      sub: "Roadmap generado con IA",
      mod: "projects",
      color: T.cyan,
    },
    {
      label: "♟️ Strategy Room",
      sub: "FODA, Canvas, GTM, OKRs, TAM",
      mod: "strategy",
      color: "#8B5CF6",
    },
    {
      label: "🔗 Integrations Hub",
      sub: "7 herramientas reales vía MCP",
      mod: "integrations",
      color: T.green,
    },
  ];

  return (
    <div style={{ padding: "24px 20px", maxWidth: "860px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "22px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "900",
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
          }}
        >
          ⚡ Command Center
        </h1>
        <p style={{ color: T.muted, margin: 0, fontSize: "12px" }}>
          Sistema Operativo de Negocios con IA · v3.0
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        {stats.map((st) => (
          <div key={st.label} style={{ ...glass, padding: "16px 14px" }}>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "900",
                color: st.color,
                letterSpacing: "-1px",
              }}
            >
              {st.value}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: T.muted,
                marginTop: "3px",
                fontWeight: "600",
              }}
            >
              {st.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {actions.map((a) => (
          <button
            key={a.mod}
            onClick={() => onNavigate(a.mod)}
            style={{
              ...glass,
              padding: "16px",
              border: `1px solid ${a.color}18`,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.border = `1px solid ${a.color}40`)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.border = `1px solid ${a.color}18`)
            }
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: T.text,
                marginBottom: "3px",
              }}
            >
              {a.label}
            </div>
            <div style={{ fontSize: "11px", color: T.muted }}>{a.sub}</div>
          </button>
        ))}
      </div>

      {/* Recent projects */}
      <div style={{ ...glass, padding: "18px" }}>
        <div
          style={{
            fontSize: "9px",
            color: T.muted,
            fontWeight: "700",
            letterSpacing: "2.5px",
            marginBottom: "14px",
          }}
        >
          PROYECTOS RECIENTES
        </div>
        {projects.length === 0 ? (
          <div style={{ textAlign: "center", color: T.faint, padding: "18px 0" }}>
            <div style={{ fontSize: "30px", marginBottom: "8px" }}>🚀</div>
            <div
              style={{ fontSize: "13px", color: "#334155", marginBottom: "10px" }}
            >
              Sin proyectos todavía.
            </div>
            <button
              onClick={() => onNavigate("projects")}
              style={{ ...btn(), fontSize: "12px", padding: "7px 16px" }}
            >
              Crear primer proyecto →
            </button>
          </div>
        ) : (
          projects.slice(0, 5).map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    marginBottom: "4px",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  <span style={tag(T.accent)}>{p.type}</span>
                  <span style={{ fontSize: "10px", color: "#334155" }}>
                    {p.roadmap?.phases?.length || 0} fases
                  </span>
                </div>
              </div>
              <span style={tag(T.green)}>{p.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
