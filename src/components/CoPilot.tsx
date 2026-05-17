// ─────────────────────────────────────────────────────────────
// AION — AI Co-Pilot with Real Streaming
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import type { ChatHistory, ModeName } from "../types";
import { MODES, MODE_SUGGESTIONS } from "../config/constants";
import { callAIStream } from "../config/api";
import { T, glass, btn, inp } from "../config/theme";

interface CoPilotProps {
  chatHistory: ChatHistory;
  saveChats: (chats: ChatHistory) => void;
  addToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function CoPilot({ chatHistory, saveChats, addToast }: CoPilotProps) {
  const [mode, setMode] = useState<ModeName>("strategy");
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const msgs = chatHistory[mode] || [];
  const m = MODES[mode];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading, streaming]);

  const setMsgs = (newMsgs: typeof msgs) => {
    saveChats({ ...chatHistory, [mode]: newMsgs });
  };

  const send = async () => {
    if (!inputVal.trim() || loading) return;
    const userMsg = { role: "user" as const, content: inputVal.trim() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInputVal("");
    setLoading(true);
    setStreaming("");

    // Create abort controller for cancellation
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ✅ Real streaming — text appears as it's generated
      const fullReply = await callAIStream(
        newMsgs,
        m.prompt,
        m.maxTokens,
        (text) => setStreaming(text),
        controller.signal
      );

      setStreaming("");
      setMsgs([...newMsgs, { role: "assistant", content: fullReply }]);
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") {
        // User cancelled — save partial response
        if (streaming) {
          setMsgs([
            ...newMsgs,
            { role: "assistant", content: streaming + "\n\n_(cancelado)_" },
          ]);
        }
        addToast("Respuesta cancelada", "info");
      } else {
        addToast(err.message, "error");
        setMsgs([
          ...newMsgs,
          { role: "assistant", content: `⚠️ Error: ${err.message}` },
        ]);
      }
    }

    setStreaming("");
    setLoading(false);
    abortRef.current = null;
    inputRef.current?.focus();
  };

  const cancelStream = () => {
    abortRef.current?.abort();
  };

  const clearHistory = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setMsgs([]);
    setConfirmClear(false);
    addToast("Historial borrado", "info");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 0px)",
        padding: "16px",
        gap: "12px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "19px",
              fontWeight: "900",
              margin: "0 0 2px",
              letterSpacing: "-0.3px",
            }}
          >
            🧠 AI Co-Pilot
          </h1>
          <p style={{ color: T.muted, margin: 0, fontSize: "11px" }}>
            6 modos especializados · Streaming real · max {m.maxTokens}{" "}
            tokens/respuesta
          </p>
        </div>
        <button
          onClick={clearHistory}
          style={{
            ...btn(confirmClear ? T.red : "#475569", true),
            fontSize: "11px",
            padding: "5px 11px",
          }}
        >
          {confirmClear ? "¿Seguro? Click de nuevo" : "Limpiar"}
        </button>
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", flexShrink: 0 }}>
        {(Object.entries(MODES) as [ModeName, typeof m][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              background: mode === k ? v.color : "transparent",
              border: `1px solid ${mode === k ? v.color : "rgba(255,255,255,0.07)"}`,
              color: mode === k ? "#fff" : T.muted,
              transition: "all 0.14s",
            }}
          >
            {v.emoji} {v.label}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          ...glass,
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minHeight: 0,
        }}
      >
        {/* Empty state with suggestions */}
        {msgs.length === 0 && !loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "42px" }}>{m.emoji}</div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: m.color }}>
              {m.label}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#334155",
                textAlign: "center",
                maxWidth: "220px",
                lineHeight: "1.6",
              }}
            >
              Modo activo con streaming real y hasta{" "}
              {m.maxTokens.toLocaleString()} tokens por respuesta.
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                marginTop: "8px",
                width: "100%",
                maxWidth: "340px",
              }}
            >
              {MODE_SUGGESTIONS[mode]?.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInputVal(s)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    padding: "7px 12px",
                    cursor: "pointer",
                    color: "#475569",
                    fontSize: "11px",
                    textAlign: "left",
                    transition: "all 0.14s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#94A3B8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#475569")
                  }
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {msgs.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "86%",
                padding: "10px 14px",
                fontSize: "13px",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                background:
                  msg.role === "user"
                    ? `${m.color}14`
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  msg.role === "user"
                    ? m.color + "28"
                    : "rgba(255,255,255,0.06)"
                }`,
                borderRadius:
                  msg.role === "user"
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                color: "#CBD5E1",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming message (real-time) */}
        {streaming && (
          <div style={{ display: "flex" }}>
            <div
              style={{
                maxWidth: "86%",
                padding: "10px 14px",
                fontSize: "13px",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "14px 14px 14px 4px",
                color: "#CBD5E1",
              }}
            >
              {streaming}
              <span style={{ opacity: 0.5, animation: "blink 0.8s infinite" }}>
                ▋
              </span>
            </div>
          </div>
        )}

        {/* Loading dots (before stream starts) */}
        {loading && !streaming && (
          <div style={{ display: "flex" }}>
            <div
              style={{
                ...glass,
                padding: "10px 16px",
                borderRadius: "14px 14px 14px 4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: m.color,
                      animation: `dot 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Modo ${m.label} · Enter para enviar`}
          style={{ ...inp, flex: 1 }}
          onFocus={(e) => (e.target.style.borderColor = m.color)}
          onBlur={(e) =>
            (e.target.style.borderColor = "rgba(255,255,255,0.1)")
          }
          disabled={loading}
        />
        {loading ? (
          <button
            onClick={cancelStream}
            style={{ ...btn(T.red), minWidth: "68px" }}
          >
            ■
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!inputVal.trim()}
            style={{
              ...btn(m.color),
              opacity: !inputVal.trim() ? 0.4 : 1,
              minWidth: "68px",
            }}
          >
            ↑
          </button>
        )}
      </div>
    </div>
  );
}
