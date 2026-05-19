// ─────────────────────────────────────────────────────────────
// AION — Strategy Room
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import type { StrategySession } from "../types";
import { STRATEGY_SESSIONS, STRATEGY_PROMPTS } from "../config/constants";
import { callAI } from "../config/api";
import { storage } from "../hooks/useStorage";
import { T, glass, btn, inp } from "../config/theme";

interface StrategyRoomProps {
  addToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function StrategyRoom({ addToast }: StrategyRoomProps) {
  const [sel, setSel] = useState<StrategySession | null>(null);
  const [ctx, setCtx] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const run = async () => {
    if (!sel || !ctx.trim() || loading) return;
    setLoading(true);
    setResult("");
    setSaved(false);
    try {
      const cfg = STRATEGY_PROMPTS[sel.id];
      const res = await callAI(
        [{ role: "user", content: ctx }],
        cfg.sys +
          ctx +
          ". Responde en español. Sé exhaustivo, usa estructura clara con secciones y sub-puntos.",
        [],
        cfg.tokens
      );
      setResult(res);
    } catch (e) {
      addToast((e as Error).message, "error");
      setResult("Error: " + (e as Error).message);
    }
    setLoading(false);
  };

  const saveResult = () => {
    if (!sel) return;
    try {
      const key = `strat_${sel.id}_${Date.now()}`;
      storage.set(key, {
        session: sel.label,
        context: ctx,
        result,
        ts: new Date().toISOString(),
      });
      setSaved(true);
      addToast(`${sel.label} guardado`, "success");
    } catch {
      addToast("No se pudo guardar", "error");
    }
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
        ♟️ Strategy Room
      </h1>
      <p style={{ color: T.muted, margin: "0 0 20px", fontSize: "11px" }}>
        Sesiones de estrategia profunda con IA.
      </p>

      {/* Session selector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "8px",
          marginBottom: "18px",
        }}
      >
        {STRATEGY_SESSIONS.map((ss) => (
          <button
            key={ss.id}
            onClick={() => {
              setSel(ss);
              setResult("");
              setSaved(false);
            }}
            style={{
              ...glass,
              padding: "14px",
              cursor: "pointer",
              textAlign: "left",
              background:
                sel?.id === ss.id
                  ? "rgba(124,58,237,0.1)"
                  : T.surface,
              border: `1px solid ${sel?.id === ss.id ? "rgba(124,58,237,0.4)" : T.border}`,
              transition: "all 0.13s",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "5px" }}>
              {ss.emoji}
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: sel?.id === ss.id ? "#A78BFA" : T.text,
              }}
            >
              {ss.label}
            </div>
            <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px" }}>
              {ss.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Input + Result */}
      {sel && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ ...glass, padding: "18px" }}>
            <label
              style={{
                fontSize: "9px",
                color: T.muted,
                fontWeight: "700",
                letterSpacing: "2.5px",
              }}
            >
              DESCRIBE TU NEGOCIO O CONTEXTO
            </label>
            <textarea
              value={ctx}
              onChange={(e) => setCtx(e.target.value)}
              placeholder="Ej: SaaS de gestión de inventarios para restaurantes en LATAM. Actualmente en beta, 50 usuarios piloto. Precio: $49/mes. Competidores: X, Y, Z."
              style={{
                ...inp,
                marginTop: "8px",
                minHeight: "90px",
                resize: "vertical",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.accent)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
            <button
              onClick={run}
              disabled={loading || !ctx.trim()}
              style={{
                ...btn(),
                marginTop: "10px",
                opacity: loading || !ctx.trim() ? 0.4 : 1,
              }}
            >
              {loading
                ? `⏳ Generando ${sel.label}...`
                : `${sel.emoji} Generar ${sel.label}`}
            </button>
          </div>

          {result && (
            <div style={{ ...glass, padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: T.muted,
                    fontWeight: "700",
                    letterSpacing: "2.5px",
                  }}
                >
                  {sel.emoji} {sel.label.toUpperCase()} · RESULTADO
                </div>
                <button
                  onClick={saveResult}
                  disabled={saved}
                  style={{
                    ...btn(T.green, true),
                    fontSize: "11px",
                    padding: "4px 12px",
                    opacity: saved ? 0.5 : 1,
                  }}
                >
                  {saved ? "✓ Guardado" : "💾 Guardar"}
                </button>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: "1.85",
                  color: "#94A3B8",
                  whiteSpace: "pre-wrap",
                }}
              >
                {result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
