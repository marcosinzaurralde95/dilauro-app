# ⚡ AION — AI Business Operating System

<p align="center">
  <strong>Tu co-piloto de negocios impulsado por IA</strong><br>
  Estrategia · Desarrollo · Marketing · Monetización · Planeación · Creación
</p>

---

## 🧠 ¿Qué es AION?

AION es un **Sistema Operativo de Negocios con IA** — una plataforma web que integra un co-piloto inteligente con 6 modos especializados, gestión de proyectos, sala de estrategia y hub de integraciones.

### Características principales

- 🧠 **AI Co-Pilot** — 6 modos especializados (Estrategia, Desarrollo, Marketing, Monetización, Planeación, Creación) con streaming en tiempo real
- 🚀 **Project Intelligence** — Gestión de proyectos con roadmap generado por IA
- ♟️ **Strategy Room** — FODA, Business Canvas, Go-to-Market, Pricing, OKRs, TAM/SAM/SOM
- 🔗 **Integrations Hub** — Notion, Gmail, Calendar, Vercel, Figma, Canva, Gamma (vía MCP)
- ⚡ **Command Center** — Dashboard con vista general de proyectos y acceso rápido

## 🏗️ Arquitectura

```
aion/
├── src/
│   ├── App.tsx              # Root component
│   ├── types.ts             # TypeScript interfaces
│   ├── config/
│   │   ├── constants.ts     # Configuración, modos, MCP
│   │   ├── theme.ts         # Design tokens (glassmorphism)
│   │   └── api.ts           # callAI + callAIStream (SSE)
│   ├── hooks/
│   │   ├── useStorage.ts    # localStorage persistente
│   │   ├── useToast.tsx     # Sistema de notificaciones
│   │   └── useMobile.ts    # Detección responsive
│   └── components/          # 7 componentes UI
├── netlify/
│   └── edge-functions/
│       └── ai-proxy.ts      # Proxy seguro a Anthropic API
├── netlify.toml              # Build & deploy config
└── .env.example              # Variables de entorno
```

## 🚀 Setup

### Requisitos
- Node.js 18+
- Cuenta de [Anthropic](https://console.anthropic.com/) (API key)
- Cuenta de [Netlify](https://netlify.com/) (deploy)

### Desarrollo local

```bash
# Clonar el repo
git clone https://github.com/marcosinzaurralde95/dilauro-aion.git
cd dilauro-aion

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu API key

# Iniciar dev server
npm run dev
```

### Deploy en Netlify

1. Conecta este repo en [Netlify](https://app.netlify.com/)
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Configura las variables de entorno en **Site → Environment Variables**:
   - `ANTHROPIC_API_KEY` = tu API key de Anthropic
   - `AION_APP_TOKEN` = un token secreto (mismo valor en `VITE_APP_TOKEN`)

## 🔐 Seguridad

- ✅ API key de Anthropic nunca se expone al frontend
- ✅ Edge Function valida Bearer token en cada request
- ✅ Rate limiting por IP (30 req/min)
- ✅ Validación de body (mensajes, roles, max_tokens)

## 📄 Licencia

MIT — Dilauro © 2026
