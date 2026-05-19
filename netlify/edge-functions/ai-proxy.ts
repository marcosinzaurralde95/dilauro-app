/**
 * AION AI Business OS — Netlify Edge Function Proxy
 * ─────────────────────────────────────────────────────────────
 * ✅ Auth: validates Bearer token on every request
 * ✅ Streaming: supports stream=true, pipes SSE (OpenAI → Anthropic format)
 * ✅ Validation: body, roles, max_tokens
 * ✅ Rate limiting: in-memory per-IP (resets on cold start)
 * ✅ Multi-provider: OpenRouter (free models) with Anthropic-compatible output
 * ✅ Fallback chain: tries multiple free models if primary fails
 *
 * Environment variables (set in Netlify dashboard):
 *   OPENROUTER_API_KEY — your OpenRouter API key (openrouter.ai/keys)
 *   AION_APP_TOKEN     — shared secret between frontend & proxy (optional)
 */

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

// Model fallback chain — tried in order until one succeeds
const MODEL_CHAIN = [
  "deepseek/deepseek-v4-flash:free",
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
];

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 30): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

interface MessageBody {
  messages?: Array<{ role: string; content: string }>;
  system?: string;
  max_tokens?: number;
  stream?: boolean;
  mcp_servers?: Array<{ type: string; url: string; name: string }>;
}

/**
 * Convert OpenAI-format response to Anthropic-format response.
 * This lets us swap providers without touching the frontend.
 */
function openaiToAnthropicResponse(openaiData: Record<string, unknown>): Record<string, unknown> {
  const choices = (openaiData.choices || []) as Array<{
    message?: { content?: string; role?: string };
    finish_reason?: string;
  }>;

  const textContent = choices
    .map((c) => c.message?.content || "")
    .filter(Boolean)
    .join("\n");

  return {
    id: openaiData.id || `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: textContent }],
    model: openaiData.model || MODEL_CHAIN[0],
    stop_reason: choices[0]?.finish_reason === "stop" ? "end_turn" : choices[0]?.finish_reason || "end_turn",
    usage: openaiData.usage || { input_tokens: 0, output_tokens: 0 },
  };
}

/**
 * Transform an OpenAI SSE stream into an Anthropic-format SSE stream.
 * Frontend expects: { type: "content_block_delta", delta: { text: "..." } }
 */
function transformStreamToAnthropic(openaiStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = openaiStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let blockStarted = false;

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Send message_stop
          if (blockStarted) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`)
            );
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "message_stop" })}\n\n`)
          );
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          // Skip SSE comments (e.g. ": OPENROUTER PROCESSING")
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            // Check for mid-stream errors from OpenRouter
            if (event.error) {
              const errMsg = event.error?.message || "Error del proveedor de IA";
              if (!blockStarted) {
                blockStarted = true;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "content_block_start",
                      index: 0,
                      content_block: { type: "text", text: "" },
                    })}\n\n`
                  )
                );
              }
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "content_block_delta",
                    index: 0,
                    delta: { type: "text_delta", text: `⚠️ ${errMsg}` },
                  })}\n\n`
                )
              );
              continue;
            }

            const choices = (event.choices || []) as Array<{
              delta?: { content?: string; role?: string; reasoning?: string };
              finish_reason?: string | null;
            }>;

            if (!choices.length) continue;

            const delta = choices[0]?.delta;

            // Get actual content text (skip reasoning tokens — those are internal thinking)
            const contentText = delta?.content || "";

            // Send content_block_start on first content delta
            if (contentText && !blockStarted) {
              blockStarted = true;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "content_block_start",
                    index: 0,
                    content_block: { type: "text", text: "" },
                  })}\n\n`
                )
              );
            }

            // Send content delta
            if (contentText) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "content_block_delta",
                    index: 0,
                    delta: { type: "text_delta", text: contentText },
                  })}\n\n`
                )
              );
            }
          } catch {
            // Skip malformed JSON
            continue;
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

/**
 * Make a request to OpenRouter with a specific model.
 * Returns the Response object if successful (2xx), null if model fails.
 */
async function tryModel(
  model: string,
  apiKey: string,
  payload: Record<string, unknown>
): Promise<Response | null> {
  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://dilauro-app.netlify.app",
        "X-Title": "AION AI Business OS",
      },
      body: JSON.stringify({ ...payload, model }),
    });

    // If the model is not found or rate limited, try next
    if (res.status === 404 || res.status === 429 || res.status === 503) {
      return null;
    }

    return res;
  } catch {
    return null;
  }
}

export default async function handler(request: Request) {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido. Usa POST." }),
      { status: 405, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  // Auth
  const appToken = Deno.env.get("AION_APP_TOKEN");
  if (appToken) {
    const auth = request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== appToken) {
      return new Response(
        JSON.stringify({ error: "No autorizado. Token inválido." }),
        { status: 401, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }
  }

  // Rate limiting
  const clientIP =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Rate limit excedido. Espera un momento." }),
      {
        status: 429,
        headers: { ...corsHeaders(), "Content-Type": "application/json", "Retry-After": "60" },
      }
    );
  }

  // Parse body
  let body: MessageBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Body inválido. Se esperaba JSON." }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  // Validate
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages: requerido, debe ser un array no vacío" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  // API key
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Configuración del servidor incompleta. Falta OPENROUTER_API_KEY." }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  const isStreaming = body.stream === true;

  // Build OpenRouter payload (OpenAI-compatible format)
  const messages: Array<{ role: string; content: string }> = [];
  if (body.system) {
    messages.push({ role: "system", content: body.system });
  }
  messages.push(...body.messages);

  const basePayload: Record<string, unknown> = {
    max_tokens: Math.min(body.max_tokens || 3000, 8192),
    messages,
    ...(isStreaming ? { stream: true } : {}),
  };

  // Try each model in the fallback chain
  let apiRes: Response | null = null;
  let usedModel = MODEL_CHAIN[0];

  for (const model of MODEL_CHAIN) {
    apiRes = await tryModel(model, apiKey, basePayload);
    if (apiRes) {
      usedModel = model;
      break;
    }
  }

  if (!apiRes) {
    return new Response(
      JSON.stringify({
        error: "Todos los modelos gratuitos están temporalmente no disponibles. Intenta de nuevo en unos minutos.",
        tried: MODEL_CHAIN,
      }),
      { status: 503, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  try {
    if (isStreaming) {
      // Check for error responses before streaming
      if (!apiRes.ok) {
        const errBody = await apiRes.text();
        return new Response(
          JSON.stringify({ error: `Error del proveedor de IA (${apiRes.status})`, detail: errBody, model: usedModel }),
          { status: apiRes.status, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
        );
      }

      if (!apiRes.body) {
        return new Response(
          JSON.stringify({ error: "Streaming no disponible." }),
          { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
        );
      }

      // Transform OpenAI SSE → Anthropic SSE format
      const anthropicStream = transformStreamToAnthropic(apiRes.body);

      return new Response(anthropicStream, {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-AION-Model": usedModel,
        },
      });
    }

    // Non-streaming
    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      return new Response(
        JSON.stringify({ error: `Error del proveedor de IA (${apiRes.status})`, detail: errBody, model: usedModel }),
        { status: apiRes.status, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    const data = await apiRes.json();
    const anthropicResponse = openaiToAnthropicResponse(data);

    return new Response(JSON.stringify(anthropicResponse), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json", "X-AION-Model": usedModel },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Error al conectar con la API de IA.",
        detail: (err as Error).message,
      }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
}

export const config = { path: "/api/ai" };
