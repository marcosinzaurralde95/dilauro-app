// ─────────────────────────────────────────────────────────────
// AION — Project Intelligence
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import type { Project, Roadmap } from "../types";
import { PROJECT_TYPES, ORCHESTRATIONS, MCP_LIST } from "../config/constants";
import { callAI } from "../config/api";
import { T, glass, btn, inp, tag } from "../config/theme";

const fmtTime = () =>
  new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

interface ProjectsProps {
  projects: Project[];
  saveProjects: (projects: Project[]) => void;
  addToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function Projects({ projects, saveProjects, addToast }: ProjectsProps) {
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [sel, setSel] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", type: "SaaS", description: "" });
  const [loading, setLoading] = useState(false);
  const [orchLoading, setOrchLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const create = async () => {
    if (!form.name.trim() || loading) return;
    setLoading(true);
    try {
      const sys = `Responde SOLO con JSON válido. Sin markdown, sin texto extra, sin backticks.
Estructura: {"summary":"resumen 2 líneas","phases":[{"name":"fase","duration":"X sem","tasks":["t1","t2","t3"]}],"kpis":["kpi1","kpi2","kpi3"],"risks":["riesgo1","riesgo2"],"stack":["tech1","tech2"]}
3 fases, 3 tareas c/u, 3 KPIs, 2 riesgos, 4 techs. Responde en español.`;

      const raw = await callAI(
        [
          {
            role: "user",
            content: `Proyecto: ${form.name} | Tipo: ${form.type} | ${form.description}`,
          },
        ],
        sys,
        [],
        1500
      );

      let roadmap: Roadmap;
      try {
        roadmap = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        roadmap = {
          summary: raw,
          phases: [],
          kpis: [],
          risks: [],
          stack: [],
        };
      }

      const project: Project = {
        id: Date.now().toString(),
        ...form,
        status: "active",
        roadmap,
        createdAt: new Date().toISOString(),
        integrations: {},
      };

      const updated = [project, ...projects];
      saveProjects(updated);
      setSel(project);
      setView("detail");
      setForm({ name: "", type: "SaaS", description: "" });
      addToast("Proyecto creado con roadmap IA", "success");
    } catch (e) {
      addToast(`Error al generar roadmap: ${(e as Error).message}`, "error");
    }
    setLoading(false);
  };

  const deleteProject = (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }
    saveProjects(projects.filter((p) => p.id !== id));
    if (sel?.id === id) {
      setSel(null);
      setView("list");
    }
    setConfirmDelete(null);
    addToast("Proyecto eliminado", "info");
  };

  const orchestrate = async (project: Project, svcName: string) => {
    const mcp = MCP_LIST.find((m) => m.name === svcName);
    if (!mcp) return;
    setOrchLoading(svcName);

    const prompts: Record<string, string> = {
      notion: `Crea una página en Notion con el proyecto "${project.name}". Tipo: ${project.type}. Descripción: ${project.description}. Roadmap con ${project.roadmap?.phases?.length} fases. KPIs: ${(project.roadmap?.kpis || []).join(", ")}.`,
      calendar: `Crea eventos en Google Calendar para el proyecto "${project.name}". Fases: ${(project.roadmap?.phases || []).map((p, i) => `Fase ${i + 1}: ${p.name} (${p.duration})`).join("; ")}.`,
      gamma: `Crea una presentación ejecutiva en Gamma sobre el proyecto "${project.name}". Tipo: ${project.type}. ${project.description}. Stack: ${(project.roadmap?.stack || []).join(", ")}.`,
      vercel: `Lista mis proyectos en Vercel con estado de deployment actual.`,
    };

    try {
      const reply = await callAI(
        [
          {
            role: "user",
            content:
              prompts[svcName] ||
              `Ejecuta acción para ${project.name} via ${svcName}`,
          },
        ],
        `Eres un asistente que usa herramientas MCP de ${mcp.label}. Ejecuta la acción y reporta exactamente qué hiciste con detalles.`,
        [{ type: "url", url: mcp.url, name: mcp.name }],
        1500
      );

      const upd: Project = {
        ...project,
        integrations: {
          ...project.integrations,
          [svcName]: { done: true, result: reply, ts: fmtTime() },
        },
      };
      saveProjects(projects.map((p) => (p.id === project.id ? upd : p)));
      setSel(upd);
      addToast(`${mcp.label} sincronizado correctamente`, "success");
    } catch (e) {
      addToast(`Error con ${mcp.label}: ${(e as Error).message}`, "error");
    }
    setOrchLoading(null);
  };

  // ── CREATE VIEW ──────────────────────────────────────────
  if (view === "create")
    return (
      <div style={{ padding: "20px", maxWidth: "540px", margin: "0 auto" }}>
        <button
          onClick={() => setView("list")}
          style={{
            background: "none",
            border: "none",
            color: T.muted,
            cursor: "pointer",
            marginBottom: "16px",
            fontSize: "13px",
          }}
        >
          ← Volver
        </button>
        <h1
          style={{
            fontSize: "19px",
            fontWeight: "900",
            margin: "0 0 20px",
            letterSpacing: "-0.3px",
          }}
        >
          🚀 Nuevo Proyecto
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                fontSize: "9px",
                color: T.muted,
                fontWeight: "700",
                letterSpacing: "2.5px",
              }}
            >
              NOMBRE DEL PROYECTO
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: VORTEX, ContentOS, FinanceAI..."
              style={{ ...inp, marginTop: "6px" }}
              onFocus={(e) => (e.target.style.borderColor = T.accent)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "9px",
                color: T.muted,
                fontWeight: "700",
                letterSpacing: "2.5px",
              }}
            >
              TIPO
            </label>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                marginTop: "6px",
              }}
            >
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "600",
                    background: form.type === t ? T.accent : "transparent",
                    border: `1px solid ${form.type === t ? T.accent : "rgba(255,255,255,0.09)"}`,
                    color: form.type === t ? "#fff" : T.muted,
                    transition: "all 0.13s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: "9px",
                color: T.muted,
                fontWeight: "700",
                letterSpacing: "2.5px",
              }}
            >
              DESCRIPCIÓN
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="¿Qué problema resuelve? ¿A quién va dirigido? ¿Modelo de negocio? Cuanta más info, mejor el roadmap."
              style={{ ...inp, marginTop: "6px", minHeight: "90px", resize: "vertical" }}
              onFocus={(e) => (e.target.style.borderColor = T.accent)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
          </div>
          <button
            onClick={create}
            disabled={loading || !form.name.trim()}
            style={{
              ...btn(),
              padding: "12px",
              fontSize: "14px",
              fontWeight: "700",
              opacity: loading || !form.name.trim() ? 0.4 : 1,
            }}
          >
            {loading
              ? "⏳ Generando roadmap con IA..."
              : "🚀 Crear Proyecto con IA"}
          </button>
        </div>
      </div>
    );

  // ── DETAIL VIEW ──────────────────────────────────────────
  if (view === "detail" && sel)
    return (
      <div style={{ padding: "20px", maxWidth: "780px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => setView("list")}
            style={{
              background: "none",
              border: "none",
              color: T.muted,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ← Proyectos
          </button>
          <button
            onClick={() => deleteProject(sel.id)}
            style={{
              ...btn(T.red, true),
              fontSize: "11px",
              padding: "4px 12px",
            }}
          >
            {confirmDelete === sel.id ? "¿Confirmar?" : "🗑 Eliminar"}
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "900",
              margin: "0 0 8px",
              letterSpacing: "-0.5px",
            }}
          >
            {sel.name}
          </h1>
          <div style={{ display: "flex", gap: "6px" }}>
            <span style={tag(T.accent)}>{sel.type}</span>
            <span style={tag(T.green)}>{sel.status}</span>
            <span
              style={{
                fontSize: "10px",
                color: "#334155",
                display: "flex",
                alignItems: "center",
              }}
            >
              {new Date(sel.createdAt).toLocaleDateString("es")}
            </span>
          </div>
        </div>

        {/* Summary */}
        {sel.roadmap?.summary && (
          <div style={{ ...glass, padding: "16px", marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "9px",
                color: T.muted,
                fontWeight: "700",
                letterSpacing: "2.5px",
                marginBottom: "8px",
              }}
            >
              RESUMEN IA
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "1.75",
                color: "#94A3B8",
              }}
            >
              {sel.roadmap.summary}
            </p>
          </div>
        )}

        {/* Roadmap phases */}
        {sel.roadmap?.phases?.length > 0 && (
          <div style={{ ...glass, padding: "18px", marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "9px",
                color: T.muted,
                fontWeight: "700",
                letterSpacing: "2.5px",
                marginBottom: "16px",
              }}
            >
              ROADMAP · {sel.roadmap.phases.length} FASES
            </div>
            {sel.roadmap.phases.map((ph, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "12px", marginBottom: "14px" }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#7C3AED,#06B6D4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "900",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      marginBottom: "5px",
                    }}
                  >
                    {ph.name}{" "}
                    <span
                      style={{
                        color: T.muted,
                        fontWeight: "400",
                        fontSize: "11px",
                      }}
                    >
                      ({ph.duration})
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {(ph.tasks || []).map((t, j) => (
                      <span
                        key={j}
                        style={{
                          fontSize: "11px",
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${T.border}`,
                          padding: "2px 8px",
                          borderRadius: "5px",
                          color: "#64748B",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPIs & Stack */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          {sel.roadmap?.kpis?.length > 0 && (
            <div style={{ ...glass, padding: "14px" }}>
              <div
                style={{
                  fontSize: "9px",
                  color: T.muted,
                  fontWeight: "700",
                  letterSpacing: "2.5px",
                  marginBottom: "10px",
                }}
              >
                KPIs
              </div>
              {sel.roadmap.kpis.map((k, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    padding: "4px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  📊 {k}
                </div>
              ))}
            </div>
          )}
          {sel.roadmap?.stack?.length > 0 && (
            <div style={{ ...glass, padding: "14px" }}>
              <div
                style={{
                  fontSize: "9px",
                  color: T.muted,
                  fontWeight: "700",
                  letterSpacing: "2.5px",
                  marginBottom: "10px",
                }}
              >
                TECH STACK
              </div>
              {sel.roadmap.stack.map((t, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    padding: "4px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  ⚙️ {t}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risks */}
        {sel.roadmap?.risks?.length > 0 && (
          <div
            style={{
              ...glass,
              padding: "14px",
              marginBottom: "12px",
              border: "1px solid rgba(239,68,68,0.12)",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                color: "#EF4444",
                fontWeight: "700",
                letterSpacing: "2.5px",
                marginBottom: "10px",
              }}
            >
              ⚠️ RIESGOS
            </div>
            {sel.roadmap.risks.map((r, i) => (
              <div
                key={i}
                style={{
                  fontSize: "12px",
                  color: "#94A3B8",
                  padding: "4px 0",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                {r}
              </div>
            ))}
          </div>
        )}

        {/* Orchestration */}
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
            🔗 ORQUESTAR INTEGRACIONES
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            {ORCHESTRATIONS.map((o) => {
              const done = sel.integrations?.[o.name]?.done;
              const busy = orchLoading === o.name;
              return (
                <button
                  key={o.name}
                  onClick={() => orchestrate(sel, o.name)}
                  disabled={busy}
                  style={{
                    ...glass,
                    padding: "12px",
                    border: `1px solid ${done ? "#10B98128" : T.border}`,
                    cursor: busy ? "wait" : "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{o.icon}</span>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: done ? T.green : T.text,
                        }}
                      >
                        {busy ? "⏳ Ejecutando..." : o.label}
                      </div>
                      {done && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: T.green,
                            marginTop: "1px",
                          }}
                        >
                          ✓ {sel.integrations[o.name].ts}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

  // ── LIST VIEW ────────────────────────────────────────────
  return (
    <div style={{ padding: "20px", maxWidth: "780px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "22px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "19px",
              fontWeight: "900",
              margin: "0 0 3px",
              letterSpacing: "-0.3px",
            }}
          >
            🚀 Project Intelligence
          </h1>
          <p style={{ color: T.muted, margin: 0, fontSize: "11px" }}>
            IA genera roadmap + KPIs + stack en segundos.
          </p>
        </div>
        <button
          onClick={() => setView("create")}
          style={{ ...btn(), padding: "8px 14px", fontSize: "12px" }}
        >
          + Nuevo
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ ...glass, padding: "44px", textAlign: "center" }}>
          <div style={{ fontSize: "44px", marginBottom: "14px" }}>🚀</div>
          <div
            style={{ fontSize: "15px", fontWeight: "800", marginBottom: "6px" }}
          >
            Sin proyectos aún
          </div>
          <div
            style={{
              color: "#334155",
              fontSize: "12px",
              marginBottom: "18px",
              maxWidth: "280px",
              margin: "0 auto 18px",
            }}
          >
            La IA genera roadmap completo, KPIs, tech stack y análisis de
            riesgos automáticamente.
          </div>
          <button onClick={() => setView("create")} style={btn()}>
            Crear Primer Proyecto
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setSel(p);
                setView("detail");
              }}
              style={{
                ...glass,
                padding: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.border =
                  "1px solid rgba(124,58,237,0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.border = `1px solid ${T.border}`)
              }
            >
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    marginBottom: "5px",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                  }}
                >
                  <span style={tag(T.accent)}>{p.type}</span>
                  <span style={{ fontSize: "10px", color: "#334155" }}>
                    {p.roadmap?.phases?.length || 0} fases ·{" "}
                    {Object.keys(p.integrations || {}).length} integración
                    {Object.keys(p.integrations || {}).length !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>
              <span style={{ color: "#334155", fontSize: "16px" }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
