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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                       pipeline.js (Orchestrator)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 1 ─ Figma Fetch
┌────────────────────────────────────────────────────────────────┐
│  figma/client.js                                              │
│  MCP (primary) oder REST API (fallback)                       │
│                                                               │
│  Input:  fileKey, nodeId[], FIGMA_TOKEN                       │
│  Output: Raw Figma Node Tree + Screenshot (optional)          │
└───────────────────────────┬────────────────────────────────────┘
                            │ Raw Figma Tree
                            ▼
PHASE 2 ─ Transform + Classify
┌────────────────────────────────────────────────────────────────┐
│  transformer/index.js          classifier/frameClassifier.js  │
│                                                               │
│  ┌───────────────────┐         ┌─────────────────────────┐    │
│  │ Transform         │         │ Classify                │    │
│  │                   │         │                         │    │
│  │ Raw Figma Tree    │         │ frameType: fullscreen   │    │
│  │      ↓            │────────▶│ screenContext: nav      │    │
│  │ Typed Component   │         │ isPartial: false        │    │
│  │ Tree              │         │ needsHMIChrome: true    │    │
│  └───────────────────┘         └─────────────────────────┘    │
└───────────────────────────┬────────────────────────────────────┘
                            │ Component Tree + Classification
                            ▼
PHASE 2.5 ─ API Detection
┌────────────────────────────────────────────────────────────────┐
│  generator/apiRegistry.js                                     │
│                                                               │
│  Scannt Tree nach Typen (map, mediaPlayer, climate, ...)      │
│                                                               │
│  Input:  Component Tree                                       │
│  Output: { hasAPIs, detectedServices[], packages{}, envVars{} │
└───────────────────────────┬────────────────────────────────────┘
                            │ API Config
                            ▼
PHASE 3 ─ Design Tokens
┌────────────────────────────────────────────────────────────────┐
│  design/tokenEngine.js                                        │
│                                                               │
│  Input:  Component Tree + tokens/tokens.json                  │
│  Output: Tree mit BMW-Styles (Farben, Typografie, Shadows)    │
└───────────────────────────┬────────────────────────────────────┘
                            │ Styled Tree + Tokens
                            ▼
PHASE 3.5 ─ Planning Agent                       ┏━━━━━━━━━━━━┓
┌────────────────────────────────────────────┐    ┃   Claude   ┃
│  planner/planningAgent.js                  │◀──▶┃ Sonnet 4.6 ┃
│                                            │    ┗━━━━━━━━━━━━┛
│  Input:  Trees, Classifications,           │
│          API Config, Tokens, User Prompt   │
│                                            │
│  Output:                                   │
│    analysis:      screenType, components   │
│    backendPlan:   Brief fuer Backend       │
│    frontendPlan:  Brief fuer Frontend      │
│    designQAPlan:  Brief fuer Design QA     │
│    designFixPlan: Brief fuer Design Fix    │
└──┬──────────────┬─────────────────┬────────┘
   │              │                 │
   │ backendPlan  │ frontendPlan    │ designQA/FixPlan
   ▼              ▼                 │
PHASE 4a         PHASE 4b          │ (weitergereicht an Phase 6)
Backend Agent    Frontend Agent     │
(nur bei APIs)                      │
                                    │
┌──────────────┐ ┌──────────────┐   │    ┏━━━━━━━━━━━━┓
│ backendPrompt│ │frontendPrompt│   │    ┃   Claude   ┃
│ Builder.js   │ │Builder.js    │   │    ┃  Opus 4.6  ┃
│              │ │              │   │    ┗━━━━━┳━━━━━━┛
│ + Plan       │ │ + Plan       │   │          │
│ + API Docs   │ │ + Design Ru. │   │          │
│ + Tree       │ │ + Backend IF │   │          │
│      ↓       │ │ + Positionen │   │          │
│ Markdown     │ │      ↓       │   │          │
│ Prompt       │ │ Markdown     │   │          │
│              │ │ Prompt       │   │          │
└──────┬───────┘ └──────┬───────┘   │          │
       │                │           │          │
       ▼                ▼           │          │
┌──────────────┐ ┌──────────────┐   │          │
│ claudeClient │ │ claudeClient │◀─────────────┘
│ generate     │ │ generate     │   │
│ Backend()    │ │ Frontend()   │   │
│              │ │              │   │
│ Output:      │ │ Output:      │   │
│ services/*   │ │ App.jsx      │   │
│ hooks/*      │ │ components/* │   │
│ context/*    │ │              │   │
│ INTERFACE.md─┼▶│ (importiert  │   │
│              │ │ Backend-Hooks│   │
└──────┬───────┘ └──────┬───────┘   │
       │                │           │
       └───────┬────────┘           │
               ▼                    │
PHASE 5 ─ Output                    │
┌────────────────────────────────┐  │
│  output/builder.js             │  │
│                                │  │
│  output/                       │  │
│   ├── src/                     │  │
│   │   ├── main.jsx             │  │
│   │   ├── App.jsx              │  │
│   │   ├── components/          │  │
│   │   ├── services/            │  │
│   │   ├── hooks/               │  │
│   │   ├── context/             │  │
│   │   └── hmi/ (pre-built)     │  │
│   │       ├── HMIChrome.jsx    │  │
│   │       ├── HMIHeader.jsx    │  │
│   │       ├── HMIFooter.jsx    │  │
│   │       └── BMWIcons.jsx     │  │
│   ├── index.html               │  │
│   ├── package.json             │  │
│   └── vite.config.js           │  │
└──────────────┬─────────────────┘  │
               │                    │
               ▼                    ▼
PHASE 6 ─ Validation Loops
┌────────────────────────────────────────────────────────────────┐
│  validator/index.js — bis zu 3 Iterationen pro Loop           │
│                                                               │
│  ┌──────────────────────────┐  ┌───────────────────────────┐  │
│  │ BACKEND VALIDATION       │  │ DESIGN VALIDATION         │  │
│  │                          │  │                           │  │
│  │ ┌──────────────────────┐ │  │ ┌───────────────────────┐ │  │
│  │ │ Backend QA (Sonnet)  │ │  │ │ Design QA (Sonnet)    │ │  │
│  │ │                      │ │  │ │                       │ │  │
│  │ │ Prueft:              │ │  │ │ Prueft:               │ │  │
│  │ │  Syntax              │ │  │ │  Chrome-Struktur      │ │  │
│  │ │  Fehlende Exports    │ │  │ │  Offscreen-Elemente   │ │  │
│  │ │  Error-Handling      │ │  │ │  Icons + Logos        │ │  │
│  │ │  AbortController     │ │  │ │  Farben + Typografie  │ │  │
│  │ │  Unstabile Refs      │ │  │ │  Touch Targets        │ │  │
│  │ │                      │ │  │ │  Position Fidelity    │ │  │
│  │ │ → JSON { approved,  │ │  │ │                       │ │  │
│  │ │   issues[] }         │ │  │ │ → JSON { approved,   │ │  │
│  │ └──────────┬───────────┘ │  │ │   issues[] }         │ │  │
│  │            │ issues      │  │ └──────────┬────────────┘ │  │
│  │            ▼             │  │            │ issues       │  │
│  │ ┌──────────────────────┐ │  │            ▼              │  │
│  │ │ Backend Fix (Opus)   │ │  │ ┌───────────────────────┐ │  │
│  │ │                      │ │  │ │ Design Fix (Opus)     │ │  │
│  │ │ Korrigiert Code      │ │  │ │                       │ │  │
│  │ │ Schreibt auf Disk    │ │  │ │ Korrigiert Code       │ │  │
│  │ └──────────┬───────────┘ │  │ │ Schreibt auf Disk     │ │  │
│  │            └──▶ REPEAT   │  │ └──────────┬────────────┘ │  │
│  └──────────────────────────┘  │            └──▶ REPEAT    │  │
│                                └───────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
               │
               ▼
     ┌───────────────────┐
     │  cd output/       │
     │  npm install       │
     │  npm run dev       │
     │  → localhost:5173  │
     └───────────────────┘
```

## Agent-Kommunikation

```
                    ┌──────────────────┐
                    │  Planning Agent  │  Sonnet 4.6
                    └──┬──┬──┬──┬─────┘
                       │  │  │  │
     backendPlan ──────┘  │  │  └────── designFixPlan
     frontendPlan ────────┘  └───────── designQAPlan
                       │  │         │           │
                       ▼  ▼         ▼           ▼
                    ┌────────┐  ┌────────┐  ┌────────┐
                    │Backend │  │Frontend│  │Design  │
                    │ Agent  │  │ Agent  │  │QA + Fix│
                    │Opus 4.6│  │Opus 4.6│  │Loop    │
                    └───┬────┘  └───┬────┘  └───┬────┘
                        │           │           │
                        │     INTERFACE.md      │
                        │──────────▶│      issues│
                        │           │     ──────▶│ Fix
                        │           │           │──▶ Disk
                        │           │           │
                   services/    App.jsx     korrigierte
                   hooks/       components/ Dateien
                   context/
```

## Wissens-Architektur (Single Source of Truth)

```
              knowledge/bmwDesignSystem.js
              ┌──────────────────────────────┐
              │ COLORS         TYPOGRAPHY    │
              │ ICONS          CHROME        │
              │ CARD_RECIPE    MOTION        │
              │ LOGO           BANNED        │
              │ LAYOUT         SHADOWS       │
              │ SURFACE_COLOR_MAPPING        │
              └─────────────┬────────────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
  getRulesFor        getRulesFor      getRulesFor
  Frontend()         DesignQA()       DesignFix()
           │                │                │
           ▼                ▼                ▼
   Frontend Prompt   QA Agent Prompt  Fix Agent Prompt
   Builder           (User Message)   (User Message)
```

## Modell-Verwendung

| Agent | Modell | Grund |
|-------|--------|-------|
| Planning Agent | Claude Sonnet 4.6 | Schnell + guenstig, plant nur |
| Backend Agent | Claude Opus 4.6 | Komplexe Code-Generierung |
| Frontend Agent | Claude Opus 4.6 | Komplexe UI + Positionen |
| Design QA | Claude Sonnet 4.6 | Regel-Abgleich, strukturiertes JSON |
| Design Fix | Claude Opus 4.6 | Praezise Code-Korrekturen |
| Backend QA | Claude Sonnet 4.6 | Regel-Abgleich, strukturiertes JSON |
| Backend Fix | Claude Opus 4.6 | Praezise Code-Korrekturen |

## Umgebungsvariablen

```bash
FIGMA_TOKEN=...         # Figma Personal Access Token
ANTHROPIC_API_KEY=...   # Claude API Key
CLAUDE_MODEL=...        # Optional: Model Override (default: claude-opus-4-6)
```

## Ausfuehrung

### Mit Figma Plugin (empfohlen)

**1. `.env` Datei anlegen** im Projekt-Root:

```bash
FIGMA_TOKEN=dein-figma-token
ANTHROPIC_API_KEY=dein-anthropic-key
```

**2. Server starten:**

```bash
npm install
npm run server
```

Der Server laeuft auf `http://localhost:3001` und wartet auf Anfragen vom Figma Plugin.

**3. Figma Plugin oeffnen:**

- In Figma: `Plugins` > `Development` > `Fluid Prototype`
- Einen Frame auswaehlen (Klick auf den Frame in Figma)
- Optional: Beschreibung im Textfeld eingeben (hat Prioritaet ueber den Design Guide)
- "Generate Prototype" klicken

Der Status wird live im Plugin angezeigt. Nach Abschluss oeffnet "Preview oeffnen" den fertigen Prototyp im Browser.

### CLI (ohne Figma Plugin)

```bash
# Einzelner Frame
npm start -- --frame 16:4

# Mehrere Frames (Multi-Screen App)
npm start -- --frame 16:4,16:5,16:6

# REST statt MCP
npm start -- --frame 16:4 --use-rest

# Output-Verzeichnis aendern
npm start -- --frame 16:4 --output ./my-prototype
```

### Prototyp starten

```bash
cd output
npm install
npm run dev
# → http://localhost:5173
```
