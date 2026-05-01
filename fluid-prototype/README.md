# Fluid Prototype — BMW HMI Pipeline

Transforms Figma wireframes into runnable BMW iDrive prototypes (Vite + React) using a multi-agent AI pipeline.

```
node pipeline.js --frame 16:4
```

## Pipeline-Architektur

```
                                    ┌─────────────────────┐
                                    │     Figma Plugin     │
                                    │  (Frame-Selektion)   │
                                    └──────────┬──────────┘
                                               │ Frame ID + Token
                                               ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                              pipeline.js (Orchestrator)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 PHASE 1 ─ Figma Fetch
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  figma/client.js                                                        │
 │  MCP (primary) oder REST API (fallback)                                 │
 │                                                                         │
 │  Input:  fileKey, nodeId[], FIGMA_TOKEN                                 │
 │  Output: Raw Figma Node Tree + Screenshot (optional)                    │
 └──────────────────────────────────┬───────────────────────────────────────┘
                                    │ Raw Figma Tree
                                    ▼
 PHASE 2 ─ Transform + Classify
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  transformer/index.js              classifier/frameClassifier.js        │
 │                                                                         │
 │  ┌─────────────────────┐           ┌──────────────────────────┐         │
 │  │ Transform           │           │ Classify                 │         │
 │  │                     │           │                          │         │
 │  │ Raw Figma Tree      │           │ frameType: fullscreen    │         │
 │  │      ↓              │           │ placement: root          │         │
 │  │ Typed Component     │──────────▶│ screenContext: navigation │         │
 │  │ Tree (map, card,    │           │ isPartial: false         │         │
 │  │ button, text, ...)  │           │ needsHMIChrome: true     │         │
 │  └─────────────────────┘           └──────────────────────────┘         │
 └──────────────────────────────────┬───────────────────────────────────────┘
                                    │ Component Tree + Classification
                                    ▼
 PHASE 2.5 ─ API Detection
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  generator/apiRegistry.js                                               │
 │                                                                         │
 │  Scannt Component Tree nach Typen (map, mediaPlayer, climate, ...)      │
 │                                                                         │
 │  Input:  Component Tree                                                 │
 │  Output: { hasAPIs, detectedServices[], packages{}, envVars{} }         │
 │                                                                         │
 │  Beispiel: map-Node gefunden → maplibre, react-map-gl, VITE_MAPTILER   │
 └──────────────────────────────────┬───────────────────────────────────────┘
                                    │ API Config
                                    ▼
 PHASE 3 ─ Design Tokens
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  design/tokenEngine.js                                                  │
 │                                                                         │
 │  Input:  Component Tree + tokens/tokens.json                            │
 │  Output: Tree mit BMW-Styles (Farben, Typografie, Spacing, Shadows)     │
 └──────────────────────────────────┬───────────────────────────────────────┘
                                    │ Styled Tree + Tokens
                                    ▼
 PHASE 3.5 ─ Planning Agent                                   ┏━━━━━━━━━━━┓
 ┌──────────────────────────────────────────────────────────┐  ┃  Claude   ┃
 │  planner/planningAgent.js                                │  ┃  Sonnet   ┃
 │                                                          │◀▶┃  4.6     ┃
 │  Input:  Component Trees, Classifications,               │  ┗━━━━━━━━━━━┛
 │          API Config, Tokens, User Prompt                 │
 │                                                          │
 │  Output: ┌─────────────────────────────────────────────┐ │
 │          │ analysis:     screenType, components, ...    │ │
 │          │ backendPlan:  Instruktionen fuer Backend     │ │
 │          │ frontendPlan: Instruktionen fuer Frontend    │ │
 │          │ designQAPlan: Instruktionen fuer Design QA   │ │
 │          │ designFixPlan: Instruktionen fuer Design Fix │ │
 │          └─────────────────────────────────────────────┘ │
 └───────┬──────────────┬──────────────────┬────────────────┘
         │              │                  │
    backendPlan    frontendPlan      designQA/FixPlan
         │              │                  │
         ▼              ▼                  │ (weitergereicht an Phase 6)
 PHASE 4a              PHASE 4b           │
 Backend Agent         Frontend Agent     │
 (nur bei APIs)                           │
                                          │
 ┌─────────────────┐   ┌─────────────────┐│  ┏━━━━━━━━━━━┓
 │ backendPrompt   │   │ frontendPrompt  ││  ┃  Claude   ┃
 │ Builder.js      │   │ Builder.js      ││  ┃  Opus     ┃
 │                 │   │                 ││  ┃  4.6      ┃
 │ + Plan          │   │ + Plan          ││  ┗━━━━┳━━━━━━┛
 │ + API Docs      │   │ + Design Rules  ││       │
 │ + Tree          │   │ + Backend I/F   ││       │
 │      ↓          │   │ + Positionen    ││       │
 │ Markdown Prompt │   │ + Tree          ││       │
 └────────┬────────┘   │      ↓          ││       │
          │            │ Markdown Prompt ││       │
          │            └────────┬────────┘│       │
          │                     │         │       │
          ▼                     ▼         │       │
 ┌─────────────────┐   ┌─────────────────┐│       │
 │ claudeClient.js │   │ claudeClient.js ││       │
 │ generateBackend │   │ generateFrontend│◀───────┘
 │                 │   │                 ││
 │ Output:         │   │ Output:         ││
 │  services/*.js  │   │  App.jsx        ││
 │  hooks/*.js     │   │  components/*.jsx│
 │  context/*.jsx  │   │                 ││
 │  INTERFACE.md ──┼──▶│ (importiert     ││
 │                 │   │  Backend-Hooks)  ││
 └────────┬────────┘   └────────┬────────┘│
          │                     │         │
          └──────────┬──────────┘         │
                     ▼                    │
 PHASE 5 ─ Output                        │
 ┌──────────────────────────────────────┐ │
 │  output/builder.js                   │ │
 │                                      │ │
 │  Schreibt auf Disk:                  │ │
 │   output/                            │ │
 │    ├── src/                          │ │
 │    │   ├── main.jsx                  │ │
 │    │   ├── App.jsx                   │ │
 │    │   ├── components/               │ │
 │    │   ├── services/                 │ │
 │    │   ├── hooks/                    │ │
 │    │   ├── context/                  │ │
 │    │   └── hmi/  (pre-built)        │ │
 │    │       ├── HMIChrome.jsx         │ │
 │    │       ├── HMIHeader.jsx         │ │
 │    │       ├── HMIFooter.jsx         │ │
 │    │       └── BMWIcons.jsx          │ │
 │    ├── index.html                    │ │
 │    ├── package.json                  │ │
 │    └── vite.config.js                │ │
 └──────────────────┬───────────────────┘ │
                    │                     │
                    ▼                     │
 PHASE 6 ─ Validation Loops              │
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  validator/index.js (Orchestrator)                                      │
 │                                                                         │
 │  Zwei parallele Schleifen, jeweils bis zu 3 Iterationen:                │
 │                                                                         │
 │  ┌─────────────────────────────┐   ┌──────────────────────────────────┐ │
 │  │  BACKEND VALIDATION         │   │  DESIGN VALIDATION              │ │
 │  │                             │   │                                  │ │
 │  │  ┌───────────────────────┐  │   │  ┌────────────────────────────┐ │ │
 │  │  │ Backend Testing Agent │  │   │  │ Design Testing Agent       │ │ │
 │  │  │                       │  │   │  │                            │ │ │
 │  │  │ Prueft:               │  │   │  │ Prueft:                   │ │ │
 │  │  │ • Syntax              │  │   │  │ • Chrome-Struktur         │ │ │
 │  │  │ • Fehlende Exports    │  │   │  │ • Offscreen-Elemente      │ │ │
 │  │  │ • Error-Handling      │  │   │  │ • Icon-Validierung        │ │ │
 │  │  │ • AbortController     │  │   │  │ • Logo-Validierung        │ │ │
 │  │  │ • Unstabile Refs      │  │   │  │ • Farben (Blue-Tinted)    │ │ │
 │  │  │ • Race Conditions     │  │   │  │ • Typografie              │ │ │
 │  │  │                       │  │   │  │ • Touch Targets (>=64px)  │ │ │
 │  │  │ Output: JSON Verdict  │  │   │  │ • Position Fidelity       │ │ │
 │  │  │ { approved, issues }  │  │   │  │                            │ │ │
 │  │  └───────────┬───────────┘  │   │  │ Output: JSON Verdict      │ │ │
 │  │              │ issues       │   │  │ { approved, issues }       │ │ │
 │  │              ▼              │   │  └────────────┬───────────────┘ │ │
 │  │  ┌───────────────────────┐  │   │               │ issues          │ │
 │  │  │ Backend Fix Agent     │  │   │               ▼                 │ │
 │  │  │                       │  │   │  ┌────────────────────────────┐ │ │
 │  │  │ Korrigiert Code       │  │   │  │ Design Fix Agent          │ │ │
 │  │  │ Schreibt auf Disk     │  │   │  │                            │ │ │
 │  │  └───────────┬───────────┘  │   │  │ Korrigiert Code            │ │ │
 │  │              │              │   │  │ Schreibt auf Disk           │ │ │
 │  │              └──▶ REPEAT    │   │  └────────────┬───────────────┘ │ │
 │  └─────────────────────────────┘   │               └──▶ REPEAT       │ │
 │                                    └──────────────────────────────────┘ │
 │                                                                         │
 │  Alle Validation Agents nutzen Claude Opus 4.6                         │
 └──────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   cd output/          │
                        │   npm install          │
                        │   npm run dev          │
                        │                       │
                        │   → localhost:5173     │
                        └───────────────────────┘
```

## Agent-Kommunikation

```
 ┌──────────────┐
 │   Planning   │ Claude Sonnet 4.6 (schnell, guenstig)
 │    Agent     │
 └──┬──┬──┬──┬─┘
    │  │  │  │
    │  │  │  └─── designFixPlan ──────────────────────────┐
    │  │  └────── designQAPlan ─────────────────────┐     │
    │  └───────── frontendPlan ──────────┐          │     │
    └──────────── backendPlan ─────┐     │          │     │
                                   │     │          │     │
                                   ▼     ▼          ▼     ▼
                              ┌────────┬────────┬───────┬───────┐
                              │Backend │Frontend│Design │Design │
                              │ Agent  │ Agent  │  QA   │  Fix  │
                              └───┬────┴───┬────┴───┬───┴───┬───┘
                                  │        │        │       │
                                  │        │    issues      │
                                  │        │    ────────▶   │
                                  │        │        │  fixed files
                                  │        │        │◀──────│
                                  │        │        │       │
                            INTERFACE.md   │        └───┬───┘
                                  │────────▶        Validation
                                  │        │          Loop
                              Alle Agents nutzen Claude Opus 4.6
```

## Wissens-Architektur (Single Source of Truth)

```
                    knowledge/bmwDesignSystem.js
                    ┌─────────────────────────────┐
                    │  COLORS          TYPOGRAPHY  │
                    │  ICONS           CHROME      │
                    │  CARD_RECIPE     MOTION      │
                    │  LOGO            BANNED      │
                    │  LAYOUT          SHADOWS     │
                    │  SURFACE_COLOR_MAPPING       │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    getRulesForFrontend() getRulesForDesignQA() getRulesForDesignFix()
              │                │                │
              ▼                ▼                ▼
      Frontend Prompt    QA Agent Prompt   Fix Agent Prompt
      Builder            (User Message)    (User Message)
```

## Modell-Verwendung

| Agent | Modell | Grund |
|-------|--------|-------|
| Planning Agent | Claude Sonnet 4.6 | Schnell + guenstig, plant nur |
| Backend Agent | Claude Opus 4.6 | Komplexe Code-Generierung |
| Frontend Agent | Claude Opus 4.6 | Komplexe UI + Positionen |
| Design QA | Claude Opus 4.6 | Pixel-genaue Analyse |
| Design Fix | Claude Opus 4.6 | Praezise Code-Korrekturen |
| Backend QA | Claude Opus 4.6 | Tiefe Code-Analyse |
| Backend Fix | Claude Opus 4.6 | Praezise Code-Korrekturen |

## Umgebungsvariablen

```bash
FIGMA_TOKEN=...         # Figma Personal Access Token
ANTHROPIC_API_KEY=...   # Claude API Key
CLAUDE_MODEL=...        # Optional: Model Override (default: claude-opus-4-6)
```

## Ausfuehrung

```bash
# Einzelner Frame
node pipeline.js --frame 16:4

# Mehrere Frames (Multi-Screen App)
node pipeline.js --frame 16:4,16:5,16:6

# REST statt MCP
node pipeline.js --frame 16:4 --use-rest

# Output-Verzeichnis aendern
node pipeline.js --frame 16:4 --output ./my-prototype
```
