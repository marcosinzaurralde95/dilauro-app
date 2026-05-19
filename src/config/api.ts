// ─────────────────────────────────────────────────────────────
// AION AI Business OS — API Layer
// ─────────────────────────────────────────────────────────────
// ✅ Calls go through Netlify Edge Function proxy → OpenRouter
// ✅ Real streaming via SSE (Anthropic-format events)
// ✅ Auth token sent in every request
// ✅ All calls use streaming to avoid edge function timeouts
// ✅ 90-second timeout to prevent infinite hangs
// ─────────────────────────────────────────────────────────────
import type { ChatMessage, MCPIntegration } from "../types";
import { PROXY_URL, APP_TOKEN } from "./constants";

const STREAM_TIMEOUT_MS = 90_000; // 90 seconds max for any AI call

/**
 * Internal helper: reads an SSE stream and collects all text deltas.
 * Used by both callAI (buffered) and callAIStream (real-time).
 * Includes a timeout to prevent infinite hangs.
 */
async function readStream(
  res: Response,
  onDelta?: (fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming no soportado en este navegador.");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  try {
    while (true) {
      // Race between next chunk and timeout
      const readPromise = reader.read();
      const { done, value } = await readPromise;
      if (done) break;

      // Check abort signal
      if (signal?.aborted) {
        reader.cancel();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);

          if (event.type === "content_block_delta") {
            const delta = event.delta?.text || "";
            if (delta) {
              fullText += delta;
              if (onDelta) onDelta(fullText);
            }
          }

          // Stop early on message_stop
          if (event.type === "message_stop") {
            reader.cancel();
            return fullText;
          }

          if (event.type === "error") {
            throw new Error(event.error?.message || "Error en stream");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  } catch (e) {
    // If we got some text before the error, return it
    if (fullText && (e as Error).name === "AbortError") return fullText;
    throw e;
  }

  return fullText;
}

/**
 * Standard AI call (buffered streaming).
 * Uses streaming internally to avoid edge function timeouts,
 * but returns the complete text at once.
 * Used for structured outputs (JSON roadmaps, strategy sessions, MCP calls).
 */
export async function callAI(
  messages: ChatMessage[],
  system: string,
  mcpServers: { type: string; url: string; name: string }[] = [],
  maxTokens = 3000
): Promise<string> {
  const body: Record<string, unknown> = {
    messages,
    system,
    max_tokens: maxTokens,
    stream: true,
  };
  if (mcpServers.length) body.mcp_servers = mcpServers;

  // Create abort controller with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string })?.error ||
          `Error ${res.status}: ${res.statusText}`
      );
    }

    const text = await readStream(res, undefined, controller.signal);
    return text || "✓ Acción completada.";
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error("La respuesta tardó demasiado. Intenta con una consulta más corta.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Streaming AI call with real-time delta callbacks.
 * Used in Co-Pilot chat for real-time token display.
 */
export async function callAIStream(
  messages: ChatMessage[],
  system: string,
  maxTokens = 3000,
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const body = {
    messages,
    system,
    max_tokens: maxTokens,
    stream: true,
  };

  // Wrap user signal with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string })?.error ||
          `Error ${res.status}: ${res.statusText}`
      );
    }

    const text = await readStream(res, onDelta, controller.signal);
    return text || "✓ Respuesta vacía.";
  } catch (e) {
    if ((e as Error).name === "AbortError" && !signal?.aborted) {
      throw new Error("La respuesta tardó demasiado. Intenta de nuevo.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
