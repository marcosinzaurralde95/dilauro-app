// ─────────────────────────────────────────────────────────────
// AION AI Business OS v3.0 — Root Component
// ─────────────────────────────────────────────────────────────
// ✅ Modular architecture (was 1 file → 13 files)
// ✅ Full TypeScript types
// ✅ Real streaming via Cloudflare Worker proxy
// ✅ Persistent state via localStorage
// ✅ Secure: auth token, restricted CORS, validated requests
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import type { Project, ChatHistory } from "./types";
import { T, GLOBAL_KEYFRAMES } from "./config/theme";
import { usePersistedState } from "./hooks/useStorage";
import { useToast } from "./hooks/useToast";
import { useMobile } from "./hooks/useMobile";

import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./components/Dashboard";
import { CoPilot } from "./components/CoPilot";
import { Projects } from "./components/Projects";
import { StrategyRoom } from "./components/StrategyRoom";
import { IntegrationsHub } from "./components/IntegrationsHub";

export default function App() {
  const [mod, setMod] = useState("dashboard");
  const [projects, setProjects] = usePersistedState<Project[]>(
    "projects",
    []
  );
  const [chats, setChats] = usePersistedState<ChatHistory>("chats", {});
  const [collapsed, setCollapsed] = useState(false);
  const mobile = useMobile();
  const { addToast, ToastContainer } = useToast();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (mobile) setCollapsed(true);
  }, [mobile]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans',system-ui,sans-serif",
        overflow: "hidden",
      }}
    >
      {mobile && (
        <TopBar onMenuOpen={() => setCollapsed(false)} mod={mod} />
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          active={mod}
          onSelect={setMod}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobile={mobile}
        />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {mod === "dashboard" && (
            <Dashboard projects={projects} onNavigate={setMod} />
          )}
          {mod === "copilot" && (
            <CoPilot
              chatHistory={chats}
              saveChats={setChats}
              addToast={addToast}
            />
          )}
          {mod === "projects" && (
            <Projects
              projects={projects}
              saveProjects={setProjects}
              addToast={addToast}
            />
          )}
          {mod === "strategy" && <StrategyRoom addToast={addToast} />}
          {mod === "integrations" && (
            <IntegrationsHub addToast={addToast} />
          )}
        </div>
      </div>

      <ToastContainer />
      <style>{GLOBAL_KEYFRAMES}</style>
    </div>
  );
}
