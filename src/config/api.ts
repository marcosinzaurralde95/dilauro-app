// ─────────────────────────────────────────────────────────────
// AION AI Business OS — API Layer
// ─────────────────────────────────────────────────────────────
// ✅ Calls go through Cloudflare Worker proxy (never direct to Anthropic)
// ✅ Real streaming via SSE
// ✅ Auth token sent in every request
// ─────────────────────────────────────────────────────────────
import type { ChatMessage, MCPIntegration } from "../types";
import { PROXY_URL, APP_TOKEN } from "./constants";

/**
 * Standard (non-streaming) AI call.
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
  };
  if (mcpServers.length) body.mcp_servers = mcpServers;

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ||
        `Error ${res.status}: ${res.statusText}`
    );
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  // Text blocks
  const texts = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .filter(Boolean);
  if (texts.length) return texts.join("\n");

  // MCP tool results
  const toolResults = (data.content || [])
    .filter((b: { type: string }) => b.type === "mcp_tool_result")
    .map((b: { content?: { text?: string }[] }) => b.content?.[0]?.text || "")
    .filter(Boolean);

  return toolResults.join("\n") || "✓ Acción completada.";
}

/**
 * Streaming AI call.
 * Used in Co-Pilot chat for real-time token display.
 * Calls the worker with stream=true → receives SSE → yields text deltas.
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

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ||
        `Error ${res.status}: ${res.statusText}`
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming no soportado en este navegador.");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const event = JSON.parse(data);

        // Anthropic streaming event types
        if (event.type === "content_block_delta") {
          const delta = event.delta?.text || "";
          if (delta) {
            fullText += delta;
            onDelta(fullText);
          }
        }

        // Handle errors mid-stream
        if (event.type === "error") {
          throw new Error(event.error?.message || "Error en stream");
        }
      } catch (e) {
        // Skip malformed JSON lines (common in SSE)
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return fullText || "✓ Respuesta vacía.";
}
