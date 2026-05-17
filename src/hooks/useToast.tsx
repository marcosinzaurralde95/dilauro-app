// ─────────────────────────────────────────────────────────────
// AION — Toast Notification System
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from "react";
import type { Toast } from "../types";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info", duration = 4000) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        duration
      );
    },
    []
  );

  function ToastContainer() {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "340px",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "500",
              color: "#fff",
              background:
                t.type === "error"
                  ? "#EF444490"
                  : t.type === "success"
                    ? "#10B98190"
                    : "#334155",
              border: `1px solid ${
                t.type === "error"
                  ? "#EF444440"
                  : t.type === "success"
                    ? "#10B98140"
                    : "#475569"
              }`,
              backdropFilter: "blur(12px)",
              animation: "slideIn 0.2s ease",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              lineHeight: "1.5",
            }}
          >
            {t.type === "error"
              ? "⚠️ "
              : t.type === "success"
                ? "✓ "
                : "ℹ️ "}
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  return { addToast, ToastContainer };
}
