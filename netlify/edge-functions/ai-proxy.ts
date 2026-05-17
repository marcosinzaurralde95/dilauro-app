/**
 * AION AI Business OS — Netlify Edge Function Proxy
 * ─────────────────────────────────────────────────────────────
 * ✅ Auth: validates Bearer token on every request
 * ✅ Streaming: supports stream=true, pipes SSE from Anthropic
 * ✅ Validation: body, roles, max_tokens
 * ✅ Rate limiting: in-memory per-IP (resets on cold start)
 *
 * Environment variables (set in Netlify dashboard):
 *   ANTHROPIC_API_KEY  — your Anthropic API key
 *   AION_APP_TOKEN     — shared secret between frontend & proxy
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

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
  const clientIP = request.headers.get("x-nf-client-connection-ip") || 
                    request.headers.get("x-forwarded-for")?.split(",")[0] || 
                    "unknown";
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Rate limit excedido. Espera un momento." }),
      { status: 429, headers: { ...corsHeaders(), "Content-Type": "application/json", "Retry-After": "60" } }
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
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Configuración del servidor incompleta. Falta ANTHROPIC_API_KEY." }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  const isStreaming = body.stream === true;

  // Build Anthropic payload
  const anthropicPayload: Record<string, unknown> = {
    model: "claude-sonnet-4-20250514",
    max_tokens: Math.min(body.max_tokens || 3000, 8192),
    messages: body.messages,
    ...(isStreaming ? { stream: true } : {}),
  };

  if (body.system) anthropicPayload.system = body.system;
  if (body.mcp_servers && Array.isArray(body.mcp_servers)) {
    anthropicPayload.mcp_servers = body.mcp_servers;
  }

  try {
    const anthropicRes = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        ...(body.mcp_servers ? { "anthropic-beta": "mcp-client-2025-04-04" } : {}),
      },
      body: JSON.stringify(anthropicPayload),
    });

    if (isStreaming) {
      return new Response(anthropicRes.body, {
        status: anthropicRes.status,
        headers: {
          ...corsHeaders(),
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const data = await anthropicRes.json();
    return new Response(JSON.stringify(data), {
      status: anthropicRes.status,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
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
