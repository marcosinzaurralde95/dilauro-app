// ─────────────────────────────────────────────────────────────
// AION AI Business OS — Type Definitions
// ─────────────────────────────────────────────────────────────

export interface Phase {
  name: string;
  duration: string;
  tasks: string[];
}

export interface Roadmap {
  summary: string;
  phases: Phase[];
  kpis: string[];
  risks: string[];
  stack: string[];
}

export interface IntegrationResult {
  done: boolean;
  result: string;
  ts: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "active" | "paused" | "completed";
  roadmap: Roadmap;
  createdAt: string;
  integrations: Record<string, IntegrationResult>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatHistory = Record<string, ChatMessage[]>;

export type ModeName =
  | "strategy"
  | "development"
  | "marketing"
  | "monetization"
  | "planning"
  | "creation";

export interface ModeConfig {
  label: string;
  emoji: string;
  color: string;
  maxTokens: number;
  prompt: string;
}

export interface MCPIntegration {
  name: string;
  label: string;
  icon: string;
  color: string;
  url: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export interface StrategySession {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export interface StrategyPromptConfig {
  sys: string;
  tokens: number;
}

export interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

export interface Orchestration {
  name: string;
  label: string;
  icon: string;
}
