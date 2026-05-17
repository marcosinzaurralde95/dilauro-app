// ─────────────────────────────────────────────────────────────
// AION — Integrations Hub (MCP)
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { MCP_LIST } from "../config/constants";
import { callAI } from "../config/api";
import { T, glass, btn, inp, tag } from "../config/theme";

const fmtTime = () =>
  new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

interface IntegrationResult {
  ok: boolean;
  text: string;
  ts: string;
}

const DEFAULT_QUERIES: Record<string, string> = {
  notion: "Lista mis páginas más recientes con sus títulos",
  gmail: "Muéstrame los últimos 5 correos no leídos",
  calendar: "¿Qué eventos tengo esta semana?",
  vercel: "Lista mis proyectos en Vercel con estado de deployment",
  figma: "¿Cuántos archivos y proyectos tengo en Figma?",
  canva: "Muéstrame mis diseños más recientes",
  gamma: "¿Qué presentaciones tengo en Gamma?",
};

interface IntegrationsHubProps {
  addToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function IntegrationsHub({ addToast }: IntegrationsHubProps) {
  const [results, setResults] = useState<Record<string, IntegrationResult>>({});
  const [queries, setQueries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const execute = async (integ: (typeof MCP_LIST)[0]) => {
    const q = queries[integ.name]?.trim() || DEFAULT_QUERIES[integ.name];
    setLoading(integ.name);
    try {
      const reply = await callAI(
        [{ role: "user", content: q }],
        `Eres un asistente que ejecuta acciones via MCP en ${integ.label}. Usa las herramientas disponibles y reporta exactamente qué encontraste o hiciste. Sé específico con los datos.`,
        [{ type: "url", url: integ.url, name: integ.name }],
        1500
      );
      setResults((p) => ({
        ...p,
        [integ.name]: { ok: true, text: reply, ts: fmtTime() },
      }));
      addToast(`${integ.label} respondió correctamente`, "success");
    } catch (e) {
      setResults((p) => ({
        ...p,
        [integ.name]: { ok: false, text: (e as Error).message, ts: fmtTime() },
      }));
      addToast(`Error con ${integ.label}: ${(e as Error).message}`, "error");
    }
    setLoading(null);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "780px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "19px",
          fontWeight: "900",
          margin: "0 0 3px",
          letterSpacing: "-0.3px",
        }}
      >
        🔗 Integrations Hub
      </h1>
      <p style={{ color: T.muted, margin: "0 0 20px", fontSize: "11px" }}>
        7 herramientas vía MCP. Requieren autenticación OAuth por servicio.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {MCP_LIST.map((integ) => {
          const res = results[integ.name];
          const busy = loading === integ.name;
          return (
            <div key={integ.name} style={{ ...glass, padding: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: `${integ.color}10`,
                    border: `1px solid ${integ.color}28`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "17px",
                    flexShrink: 0,
                  }}
                >
                  {integ.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>
                    {integ.label}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      color: "#334155",
                      fontFamily: "monospace",
                      marginTop: "1px",
                    }}
                  >
                    {integ.url}
                  </div>
                </div>
                {res && (
                  <span style={tag(res.ok ? T.green : T.red)}>
                    {res.ok ? "✓" : "✗"} {res.ts}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "7px" }}>
                <input
                  value={queries[integ.name] || ""}
                  onChange={(e) =>
                    setQueries((p) => ({
                      ...p,
                      [integ.name]: e.target.value,
                    }))
                  }
                  onFocus={(e) => {
                    if (!queries[integ.name])
                      setQueries((p) => ({
                        ...p,
                        [integ.name]: DEFAULT_QUERIES[integ.name] || "",
                      }));
                    e.target.style.borderColor = integ.color;
                  }}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                  placeholder={DEFAULT_QUERIES[integ.name]}
                  style={{ ...inp, flex: 1, fontSize: "12px" }}
                />
                <button
                  onClick={() => execute(integ)}
                  disabled={busy}
                  style={{
                    ...btn(integ.color),
                    opacity: busy ? 0.5 : 1,
                    padding: "8px 14px",
                    fontSize: "12px",
                  }}
                >
                  {busy ? "⏳" : "Ejecutar"}
                </button>
              </div>
              {res && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px 12px",
                    background: res.ok
                      ? "rgba(16,185,129,0.04)"
                      : "rgba(239,68,68,0.04)",
                    border: `1px solid ${res.ok ? "#10B98118" : "#EF444418"}`,
                    borderRadius: "8px",
                    maxHeight: "130px",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#94A3B8",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.65",
                    }}
                  >
                    {res.text}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
