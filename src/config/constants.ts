// ─────────────────────────────────────────────────────────────
// AION AI Business OS — Configuration & Constants
// ─────────────────────────────────────────────────────────────
import type {
  ModeConfig,
  ModeName,
  MCPIntegration,
  NavItem,
  StrategySession,
  StrategyPromptConfig,
  Orchestration,
} from "../types";

// ─── API Config ───────────────────────────────────────────────
// Apunta al Edge Function proxy (mismo dominio, ruta /api/ai)
export const PROXY_URL =
  import.meta.env.VITE_PROXY_URL || "/api/ai";

// Token de autenticación (validado por el Edge Function)
export const APP_TOKEN =
  import.meta.env.VITE_APP_TOKEN || "";

export const MODEL = "claude-sonnet-4-20250514";

// ─── MCP Integrations ─────────────────────────────────────────
export const MCP_LIST: MCPIntegration[] = [
  { name: "notion",   label: "Notion",   icon: "📝", color: "#a78bfa", url: "https://mcp.notion.com/mcp" },
  { name: "gmail",    label: "Gmail",    icon: "📧", color: "#EA4335", url: "https://gmailmcp.googleapis.com/mcp/v1" },
  { name: "calendar", label: "Calendar", icon: "📅", color: "#4285F4", url: "https://calendarmcp.googleapis.com/mcp/v1" },
  { name: "vercel",   label: "Vercel",   icon: "▲",  color: "#e2e8f0", url: "https://mcp.vercel.com" },
  { name: "figma",    label: "Figma",    icon: "🎨", color: "#F24E1E", url: "https://mcp.figma.com/mcp" },
  { name: "canva",    label: "Canva",    icon: "🖌️", color: "#00C4CC", url: "https://mcp.canva.com/mcp" },
  { name: "gamma",    label: "Gamma",    icon: "⚡", color: "#7C3AED", url: "https://mcp.gamma.app/mcp" },
];

// ─── AI Modes (Co-Pilot) ─────────────────────────────────────
export const MODES: Record<ModeName, ModeConfig> = {
  strategy: {
    label: "Estrategia",
    emoji: "♟️",
    color: "#8B5CF6",
    maxTokens: 3500,
    prompt:
      "Eres un estratega de negocios élite, ex-consultor McKinsey con expertise en startups y mercados LATAM. Usa frameworks como Porter, JTBD, Blue Ocean. Sé exhaustivo, estructurado y accionable. Responde en español.",
  },
  development: {
    label: "Desarrollo",
    emoji: "💻",
    color: "#06B6D4",
    maxTokens: 4000,
    prompt:
      "Eres un arquitecto de software senior con expertise en React, TypeScript, Supabase, Vercel, Cloudflare Workers. Genera código de producción completo y bien comentado. Responde en español.",
  },
  marketing: {
    label: "Marketing",
    emoji: "📈",
    color: "#F59E0B",
    maxTokens: 3000,
    prompt:
      "Eres un growth hacker experto en marketing digital SaaS. SEO técnico, content marketing, paid ads (Meta/Google), virality loops, CRO. Responde en español con métricas concretas.",
  },
  monetization: {
    label: "Monetización",
    emoji: "💰",
    color: "#10B981",
    maxTokens: 3000,
    prompt:
      "Eres experto en pricing strategy y monetización digital. Analiza modelos freemium, SaaS, marketplace, tokens. Incluye unit economics, LTV/CAC, churn. Responde en español.",
  },
  planning: {
    label: "Planeación",
    emoji: "📋",
    color: "#3B82F6",
    maxTokens: 3000,
    prompt:
      "Eres un project manager senior con expertise en OKRs, roadmapping ágil y gestión de riesgos. Usa frameworks como RICE, MoSCoW. Responde en español.",
  },
  creation: {
    label: "Creación",
    emoji: "✨",
    color: "#EC4899",
    maxTokens: 3000,
    prompt:
      "Eres un content strategist y creative director. Crea contenido viral, copy persuasivo, scripts para video, hooks para redes sociales. Responde en español.",
  },
};

// ─── Quick suggestion prompts per mode ────────────────────────
export const MODE_SUGGESTIONS: Record<ModeName, string[]> = {
  strategy: [
    "Analiza mi mercado objetivo",
    "¿Cuáles son mis ventajas competitivas?",
    "Diseña mi estrategia de diferenciación",
  ],
  development: [
    "Crea arquitectura para mi SaaS",
    "¿Qué stack recomiendas?",
    "Genera estructura de base de datos",
  ],
  marketing: [
    "Crea un plan de contenidos",
    "Estrategia de lanzamiento en redes",
    "¿Cómo adquiero mis primeros 1000 usuarios?",
  ],
  monetization: [
    "Diseña mi modelo de precios",
    "Calcula mi LTV y CAC objetivo",
    "¿Freemium o trial de 14 días?",
  ],
  planning: [
    "Genera OKRs para Q3",
    "Crea roadmap para 6 meses",
    "Prioriza mi backlog con RICE",
  ],
  creation: [
    "Escribe copy para mi landing page",
    "Genera 10 ideas de contenido",
    "Crea script para video de 60 segundos",
  ],
};

// ─── Strategy Room ────────────────────────────────────────────
export const STRATEGY_SESSIONS: StrategySession[] = [
  { id: "swot",    label: "FODA",       emoji: "🔍", desc: "Fortalezas, debilidades, oportunidades, amenazas." },
  { id: "canvas",  label: "Biz Canvas", emoji: "🗺️", desc: "Modelo de negocio en 9 bloques." },
  { id: "gtm",     label: "Go-to-Market", emoji: "🎯", desc: "Estrategia de lanzamiento." },
  { id: "pricing", label: "Pricing",    emoji: "💰", desc: "Estructura de precios óptima." },
  { id: "okr",     label: "OKRs",       emoji: "🏆", desc: "Objetivos y resultados clave." },
  { id: "tam",     label: "TAM/SAM/SOM", emoji: "📊", desc: "Tamaño de mercado." },
];

export const STRATEGY_PROMPTS: Record<string, StrategyPromptConfig> = {
  swot: {
    sys: "Eres consultor estratégico senior ex-McKinsey. Genera un análisis FODA exhaustivo y accionable con al menos 5 items por cuadrante. Incluye conclusiones estratégicas y siguientes pasos. Para: ",
    tokens: 3500,
  },
  canvas: {
    sys: "Eres experto en Business Model Canvas. Genera los 9 bloques completos con detalles específicos, ejemplos y conexiones entre bloques. Para: ",
    tokens: 3500,
  },
  gtm: {
    sys: "Eres experto en go-to-market B2B/B2C. Genera estrategia GTM completa: segmentación, canales, mensaje, pricing, plan 90 días, métricas. Para: ",
    tokens: 3500,
  },
  pricing: {
    sys: "Eres experto en pricing strategy SaaS. Genera estructura de precios completa con planes, justificación psicológica, comparativa de competencia y unit economics. Para: ",
    tokens: 3000,
  },
  okr: {
    sys: "Eres experto en OKRs. Genera OKRs para 4 trimestres: 3-4 objetivos por trimestre, 3-4 Key Results cada uno, métricas específicas y plan de tracking. Para: ",
    tokens: 3500,
  },
  tam: {
    sys: "Eres analista de mercado senior. Calcula TAM/SAM/SOM con metodología top-down y bottom-up, fuentes de datos, proyección 3 años y cálculo de revenue potencial. Para: ",
    tokens: 3000,
  },
};

// ─── Navigation ───────────────────────────────────────────────
export const NAV: NavItem[] = [
  { id: "dashboard",    label: "Command Center",      icon: "⚡" },
  { id: "copilot",      label: "AI Co-Pilot",         icon: "🧠" },
  { id: "projects",     label: "Project Intelligence", icon: "🚀" },
  { id: "strategy",     label: "Strategy Room",       icon: "♟️" },
  { id: "integrations", label: "Integrations Hub",    icon: "🔗" },
];

// ─── Project Types ────────────────────────────────────────────
export const PROJECT_TYPES = [
  "SaaS",
  "App Móvil",
  "E-commerce",
  "Marketplace",
  "Contenido",
  "Agencia",
  "Otro",
] as const;

// ─── Orchestrations (project integrations) ────────────────────
export const ORCHESTRATIONS: Orchestration[] = [
  { name: "notion",   label: "Guardar en Notion",  icon: "📝" },
  { name: "calendar", label: "Crear en Calendar",  icon: "📅" },
  { name: "gamma",    label: "Deck en Gamma",      icon: "⚡" },
  { name: "vercel",   label: "Ver en Vercel",      icon: "▲" },
];
