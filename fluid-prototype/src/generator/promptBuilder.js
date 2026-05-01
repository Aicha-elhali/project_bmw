/**
 * Phase 4a — Prompt Builder (BMW HMI Design System)
 *
 * Builds the structured prompt for Claude to generate React components
 * for a BMW center console screen from a Figma wireframe.
 * Uses the BMW HMI Design System (Operating System X / Panoramic Vision style).
 * Dynamically injects API/library instructions based on detected component types.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function collectComponentNames(node, names = new Set(), depth = 0) {
  if (depth > 0) names.add(toPascalCase(node.label));
  for (const child of node.children ?? []) collectComponentNames(child, names, depth + 1);
  return names;
}

function collectTypes(node, types = new Set()) {
  types.add(node.type);
  for (const child of node.children ?? []) collectTypes(child, types);
  return types;
}

function hasTypeInTree(node, targetTypes) {
  if (targetTypes.includes(node.type)) return true;
  for (const child of node.children ?? []) {
    if (hasTypeInTree(child, targetTypes)) return true;
  }
  const label = (node.label || '').toLowerCase();
  for (const t of targetTypes) {
    if (label.includes(t)) return true;
  }
  return false;
}

function trimTree(node, maxDepth = 6, depth = 0) {
  const trimmed = { ...node, children: [] };
  if (depth < maxDepth && node.children?.length) {
    trimmed.children = node.children.map(c => trimTree(c, maxDepth, depth + 1));
  } else if (node.children?.length) {
    trimmed._truncated = `${node.children.length} children omitted`;
  }
  return trimmed;
}

function buildContentLayoutAnalysis(tree) {
  const cb = tree.contentBounds ?? { left: 240, top: 70, width: 1400, height: 540 };
  const entries = [];
  function walk(node, depth = 0) {
    if (node.safeZoneHint && depth > 0 && depth <= 3 && node.type !== 'container') {
      entries.push({ label: node.label, type: node.type, hint: node.safeZoneHint, rel: node.relativeLayout });
    }
    for (const child of node.children ?? []) walk(child, depth + 1);
  }
  walk(tree);
  if (entries.length === 0) return '';

  let section = `## PFLICHT-POSITIONEN (aus Wireframe — EXAKT uebernehmen!)

DIESE POSITIONEN SIND DIE EINZIGE QUELLE DER WAHRHEIT fuer die Platzierung.
Jedes Element MUSS an der angegebenen Position platziert werden. Keine Abweichung > 10px.

Der Content-Container hat \`position: absolute; inset: 0\` — KEIN top/left Offset.
Positionen in der Tabelle kommen direkt aus dem Figma-Wireframe. Verwende sie 1:1 als CSS left/top.

| Element | Type | left | top | width | height |
|---------|------|------|-----|-------|--------|
`;
  for (const e of entries) {
    section += `| ${e.label} | ${e.type} | **${e.hint.left}px** | **${e.hint.top}px** | ${e.hint.width}px | ${e.hint.height}px |\n`;
  }
  section += `
**PFLICHT-REGELN:**
1. Verwende \`position: "absolute"\` mit den **left** und **top** Werten direkt als CSS-Werte innerhalb des Content-Containers
2. Verwende die **width** und **height** Werte als \`width\` und \`height\` (oder \`minWidth\`/\`minHeight\`)
3. NICHT die rohen layout.x/layout.y aus dem Component Tree verwenden — die sind Figma-Canvas-Koordinaten
4. NICHT die Positionen "verbessern" oder "zentrieren" — der Wireframe bestimmt wo ein Element steht
5. Fuer Map-Screens: Jede Content-Komponente MUSS \`pointerEvents: "auto"\` auf sich selbst setzen
`;
  return section;
}

// ---------------------------------------------------------------------------
// Example component
// ---------------------------------------------------------------------------

const EXAMPLE_COMPONENT = `
// FILE: NotificationCard.jsx
// Figma: card "notification"
import React from 'react';
import BMWIcon from '../hmi/BMWIcons.jsx';

const NotificationCard = ({ icon = "wrench", title, subtitle, time, style: overrideStyle }) => {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'linear-gradient(180deg, #243757 0%, #1B2A45 100%)',
      borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      ...overrideStyle,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(255,255,255,0.06)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <BMWIcon name={icon} size={26} color="#F0C040"/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, color: '#fff' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 16, color: '#A8B5C8', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {time && <span style={{ fontSize: 14, color: '#5C6B82' }}>{time}</span>}
    </div>
  );
};

export default NotificationCard;
`.trim();

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a structured prompt for Claude to generate React components.
 * @param {object} componentTree — Phase 3 output (tree with .style applied)
 * @param {object} tokens        — raw tokens object
 * @param {object} apiConfig     — resolved API config from apiRegistry
 * @returns {string} Full prompt text
 */
export function buildGenerationPrompt(componentTree, tokens, apiConfig = {}, userPrompt = '', mcpContext = null) {
  const trimmedTree    = trimTree(componentTree);
  const componentNames = [...collectComponentNames(componentTree)];
  const usedTypes      = [...collectTypes(componentTree)];
  const hasDisplayShape = componentTree.hasDisplayShape === true;
  const cb = componentTree.contentBounds ?? { left: 240, top: 70, width: 1400, height: 540 };

  const hasAPIs    = apiConfig.hasAPIs;
  const hasMap     = apiConfig.promptSections?.some(s => s.includes('MapLibre'));
  const pkgNames   = Object.keys(apiConfig.packages || {});

  // -- Detect missing header/footer in wireframe ----------------------------
  const headerTypes = ['statusBar', 'header', 'navbar'];
  const footerTypes = ['dock', 'footer', 'climateControl'];
  const hasHeader = hasTypeInTree(componentTree, headerTypes);
  const hasFooter = hasTypeInTree(componentTree, footerTypes);

  // -- Conditional rules ---------------------------------------------------

  const rule8 = hasAPIs
    ? `8. **External libraries**: Use ONLY React and these packages (already in package.json): ${pkgNames.join(', ') || 'none — only browser fetch()'}. For API calls use the browser's built-in \`fetch()\`. No additional npm packages.`
    : `8. **No external libraries**: Only React. No framer-motion, no MUI, no map libraries.`;

  const rule9 = hasMap
    ? `9. **Map rendering**: Use react-map-gl/maplibre with MapTiler Dark vector tiles (see API section). The map must be interactive (pan, zoom, tilt). Float BMW-styled controls on top using position absolute within the map's relative container. Use custom Marker components, not default maplibre markers.`
    : `9. **Map placeholder**: Render map areas as dark containers (#0F1A2C) with subtle gradients to suggest roads. Do NOT embed actual maps.`;

  // -- API & service layer section -----------------------------------------

  const apiSection = hasAPIs ? `
## Available APIs & Services

The following free APIs and libraries are available. All are free and require NO API keys.
NPM packages are already in package.json — just import them.

${apiConfig.promptSections.join('\n\n')}
` : '';

  const serviceLayerSection = hasAPIs ? `
## Service Layer Architecture

Organize API code in separate files — NOT inline in components:
- \`services/*.js\` — API wrappers (fetch calls, data parsing, rate limiting)
- \`hooks/*.js\` — React custom hooks that consume services (state, loading, errors)
- \`context/*.jsx\` — React contexts for shared state across components

Components import hooks and contexts, NOT services directly.
Use the exact \`// FILE:\` paths shown in the API sections above.
All hooks must clean up (clear intervals, abort fetches) in their useEffect return.
` : '';

  // -- Build prompt --------------------------------------------------------

  const wireframeScope = userPrompt
    ? `Implement the elements present in the wireframe as a ${hasAPIs ? 'fully functional' : 'static'} BMW infotainment screen. Additionally, implement any UI elements or features the user explicitly describes in their prompt — even if they do not appear in the component tree.`
    : `Implement ONLY the elements present in the wireframe as a ${hasAPIs ? 'fully functional' : 'static'} BMW infotainment screen. Do not add, invent, or hallucinate any UI elements that are not in the component tree.`;

  return `
You are a senior React engineer building a BMW in-car HMI interface. Generate a complete, working React application from a Figma wireframe that faithfully implements the wireframe. ${wireframeScope}

## BMW HMI DESIGN SYSTEM — VERBINDLICH

Du verwendest das BMW HMI Design System (Operating System X / Panoramic Vision style).
Jedes generierte UI muss aussehen wie ein echtes BMW Infotainment Display.
Die folgenden Regeln sind VERBINDLICH — keine Abweichungen.

### I. VISUELLE GRUNDLAGEN

**Hintergründe — NIEMALS reines Schwarz oder Weiß.**
- Surface Canvas: \`#0A1428\` (dunkles Blauschwarz) — der Standard-Hintergrund
- Surface Canvas Alt: \`#0E1B30\`
- Cards/Elevated: \`#1B2A45\` (Standard-Karte)
- Elevated Alt: \`#243757\` (Karten-Gradient oben)
- Elevated Strong: \`#2A4170\` (aktive Karte)
- Elevated Accent: \`#34538D\` (selektierte Karte)

**Farbstimmung:** Kühl, mondbeleuchtetes, monochromatisches Blauschwarz. Die einzige "warme" Ausnahme ist ein Now-Playing Media-Card (optional orange/rot Gradient).

**Karten-Rezept (das Arbeitstier — überall verwendet):**
\`\`\`
background: linear-gradient(180deg, #243757 0%, #1B2A45 100%);
border-radius: 12px;
box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
\`\`\`
Dazu ein Pseudo-Element \`::after\` als Grain-Overlay für "Glass-Feel":
\`\`\`
background: radial-gradient(1200px 200px at 50% -50%, rgba(255,255,255,0.06), transparent 60%),
  repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 3px);
pointer-events: none; position: absolute; inset: 0;
\`\`\`
Akzent-Karten (CTAs): solid \`#1C69D4\` mit \`0 0 24px rgba(28,105,212,0.6)\` Glow.

**Layering, nicht Full-bleed:** Neue Inhalte erscheinen als Karten die ÜBER der Map/Canvas schweben — niemals als Full-Screen-Ersatz. Modals dimmen den Hintergrund nicht; die Map bleibt dahinter lesbar.

### II. FARBEN

**BMW Blue Scale (primary / interactive):**
- 50: #E8F1FB | 100: #C5DBF5 | 200: #8DBAEC | 300: #5599E2
- 400: #2D7AE8 (hover) | **500: #1C69D4 (base)** | 600: #1656B0 (pressed)
- 700: #10428A | 800: #0B2F63 | 900: #071D3D

**Neutrals:** #FFFFFF, #F2F4F8, #D8DEE8, #A8B5C8, #8C9BB0, #5C6B82, #3D4A60, #2A3548, #1B2638, #121B2A, #0A1428, #050B17

**Text:**
- Primary: #FFFFFF | Secondary: #A8B5C8 | Tertiary: #5C6B82 | Disabled: #3D4A60
- Accent: #5BA3FF | Warning: #F0C040 | Danger: #E63946 | Success: #3CD278

**Interactive:**
- Default: #1C69D4 | Hover: #2D7AE8 | Pressed: #1656B0 | Disabled: #2A3548

**Borders:** rgba(255,255,255,0.08) default, rgba(255,255,255,0.16) strong, #2D7AE8 focus

**Status:** Warning #F0C040 | Danger #E63946 | Success #3CD278 | Info #5BA3FF

**Map (Nacht):** Background #0F1A2C | Water #1A3A5F | Roads #3A4A66 / #FFFFFF | Highway #5BA3FF | Park #1F3540 | Route #5BA3FF | User Arrow #1C69D4

### III. TYPOGRAFIE

**Font:** \`"BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif\`
WICHTIG: Die generierte App lädt Inter von Google Fonts als Fallback. Verwende diese Font-Stack-Declaration exakt.

**Type Scale (px, für ~12-Zoll HMI Screen):**
- Display (Speed, Range): 64px, weight 100 (Thin), line-height 1.1, tracking -0.01em
- H1 (Screen Titles): 48px, weight 300 (Light), line-height 1.1
- H2: 36px, weight 300, line-height 1.25
- H3 (Card Heading): 32px, weight 300, line-height 1.25
- H4 (Section Heading): 24px, weight 500 (Medium), line-height 1.25
- Page Title: 24px, weight 400, line-height 1.25
- Tab: 22px, weight 400, line-height 1.4
- Body: 22px, weight 400, line-height 1.4
- Body Secondary: 18px, weight 400, line-height 1.4
- Body Small: 16px, weight 400, line-height 1.4
- Label (UPPERCASE): 14px, weight 400, tracking 0.02em, uppercase
- Status Label (UPPERCASE): 12px, weight 400, tracking 0.06em, uppercase
- Climate Temp: 28px, weight 300, line-height 1

**Weights:** Thin 100 (nur Display-Zahlen) | Light 300 (Headings) | Regular 400 (Body, Labels) | Medium 500 (Section Headings, Buttons) | Bold 700 (nur Speed Limit)

**ALL CAPS Labels:** Immer +6% letter-spacing (\`0.06em\`).
**Tabular Numbers:** Für alle Zahlen \`font-variant-numeric: tabular-nums\`.

### IV. SPACING & TOUCH TARGETS

**4px Basis-Grid:** 0 | 2 | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 | 80 | 96

**Touch Targets:** Mindestens **64×64px** (Handschuh-tauglich). Kleinstes erlaubtes Target: 48×48px.

**Layout-Zonen (fest):**
1. **Header** oben, 48px hoch, transparent/blur, Status-Icons rechts
2. **Footer** immer sichtbar, 96px hoch: Fahrer-Klima · 7 Quick-Actions · Beifahrer-Klima
3. **Left Slot** ~80px: Fahrzeug-Status-Icons
4. **Right Slot** in der abgeschrägten Ecke — Park-Assist etc.
5. **Center** hält Map / Liste / Formular

**Bildschirm:** 1920×720px, chamfered bottom-right corner (~15-20° Diagonale).

**Card Padding:** 16px oder 24px. Section Gaps: 32-48px.

### V. BORDER-RADIUS

- Buttons: 8px | Cards: 12-16px | Search Bar: 24px
- Toggles/Avatars/Pills: 999px (full) | Key: 8px | Modal: 16px
- NIEMALS border-radius > 16px auf primären Containern (außer Pills/Toggles)

### VI. SCHATTEN & ELEVATION

- Card: \`0 2px 8px rgba(0,0,0,0.40)\` + \`inset 0 1px 0 rgba(255,255,255,0.06)\`
- Elevated: \`0 4px 16px rgba(0,0,0,0.50)\`
- Modal: \`0 8px 32px rgba(0,0,0,0.60)\`
- Primary Glow: \`0 0 24px rgba(28,105,212,0.60)\` (für aktive BMW Blue Elemente)
- Warning Glow: \`0 0 16px rgba(240,192,64,0.40)\`
- Danger Glow: \`0 0 16px rgba(230,57,70,0.50)\`

### VII. ANIMATION & MOTION

- Standard Easing: \`cubic-bezier(0.4, 0, 0.2, 1)\` (99% der Zeit)
- Decelerate (Einblenden): \`cubic-bezier(0, 0, 0.2, 1)\`
- Fast: 150ms | Base: 250ms | Slow: 400ms
- Tab-Underline: ~250ms | Cards scale-and-fade: ~200ms | Toggles: ~150ms
- VERBOTEN: Bounces, Springs, Parallax. Keine Animationen > 300ms für Feedback.

### VIII. TRANSPARENZ & BLUR

- Header/Tab-Strips auf Map: \`backdrop-filter: blur(8px)\` über \`rgba(10,20,40,0.55)\`
- Cards auf solidem Canvas sind OPAQUE — Blur nur im Map-Kontext.

### IX. BORDERS & DIVIDERS

- Fast nie verwendet. Surfaces trennen sich durch Gradient + Shadow.
- Wo nötig (Listen, Tab-Strip): \`rgba(255,255,255,0.08)\` — kaum sichtbar.

### X. HOVER / PRESS

- Hover: BMW Blue 400 (\`#2D7AE8\`) oder surface aufhellen
- Press: BMW Blue 600 (\`#1656B0\`) oder surface abdunkeln
- Active: Primary Glow Shadow. Keine Scale-Transforms.

### XI. ICONOGRAPHY

**Style:** Outline / Line-Art, 1.75-2px Stroke, rounded caps + joins, keine Fills.
**Größe:** 24×24px viewBox. In interaktiven Bereichen mindestens 24px.
**Farbe:** Default #FFFFFF | Active #1C69D4 (BMW Blue) + optional Glow | Warning #F0C040 | Danger #E63946 | Success #3CD278

KEINE EMOJI, niemals. Keine Icon-Fonts. Verwende geometrische Unicode-Symbole (▲▶●◎★✕☰♪☏△▽✳), CSS-Shapes (div+border+border-radius), oder inline SVG-Paths.

### XII. CONTENT & VOICE

**Stimme:** Knapp, technisch, deutsche Ingenieurskunst. Imperativ oder deklarativ — nie konversationell.
- "Drive carefully." (deklarativ) | "Start route guidance" (Verb-first CTA)
- "A/C OFF" (Caps, Status-Fakt) | "22 kW", "23 °C", "2:55 pm" (Zahlen immer tabular)
- Echte Adressen, nie Lorem Ipsum: "Schloßstraße 14, 80803 München"

**Casing:** Sentence case für Sätze/CTAs. ALL CAPS + 6% letter-spacing für Status-Labels. Title-case für Tabs.
**Kein "Ich" oder "Du"** — das System *verkündet* Zustände.
**Keine Emoji.** Unicode-Sonderzeichen (°, ·, →, ✕) sind erlaubt.

### XIII. SICHERHEIT & FAHRERKONTEXT — ABSOLUTE PRIORITÄT

"Kann ein Fahrer bei 130 km/h diese Information in unter 1,5 Sekunden erfassen?"

VERBOTEN:
- Mehr als 7 primäre Aktionen auf einem Screen
- Informationstiefe > 3 Menüebenen
- Modale Overlays > 40% des Screens
- Animationen > 300ms für Systemfeedback
- Parallax, Autoplay-Videos, bewegte Hintergründe

PFLICHT:
- Touch-Targets mindestens 64×64px (Handschuhe)
- Glanceability: jede primäre Aktion mit einem Blick erfassbar
- Kritische Warnings im direkten Sichtfeld

### XIV. BRAND-IDENTITÄT — BMW DNA

BMW UI = präzise, kühl, technisch überlegen, kontrolliert — Cockpit eines Hochleistungsgeräts.

VERBOTEN:
- Consumer-App-Feeling (Bottom-Nav à la Instagram/TikTok, Hamburger-Menü)
- Tesla-Look (unstrukturierte Mega-Screens)
- Warme Goldtöne (Rolls-Royce/Mercedes), Sportliches Rot (Ferrari/Audi Sport)
- Gamification, Blob-Schatten, Illustrationen
- Glassmorphism als primäres System, Neumorphism
- Standard unrestyled UI-Libraries (shadcn, MUI, Bootstrap)
- Pastel als System-Farben
- Emoji als Icons, gemischte Icon-Stile

### SELF-CHECK VOR DER CODE-GENERIERUNG

Beantworte intern vor jeder Ausgabe:
1. Hintergrund #0A1428 (nicht #000000 oder #0D0D0D)?
2. Cards mit Gradient #243757→#1B2A45 (nicht flat)?
3. Touch-Targets ≥ 64px?
4. Font "BMW Type Next" / "Inter" (nicht Arial/Helvetica/bmwTypeNextWeb)?
5. BMW Blue #1C69D4 für interaktive States?
6. Kontrast WCAG AA?
7. ≤ 7 primäre Aktionen?
8. Header (48px) + Footer (96px) Layout-Zonen vorhanden?

## Context

This is a **car center console display** (BMW HMI), not a website. The output must look like an embedded automotive infotainment screen in Operating System X / Panoramic Vision style.

Screen specification:
- **Resolution**: 1920×720 pixels (widescreen, ~2.67:1 aspect ratio)
- **Display**: Dark theme with blue-tinted surfaces, chamfered bottom-right corner
- **Interaction**: Touch-only (generous touch targets of 64px+)

Component types in this wireframe: ${usedTypes.join(', ')}
${hasAPIs ? `Dynamic services: ${apiConfig.detectedServices.join(', ')}` : ''}
${apiSection}${serviceLayerSection}
${buildContentLayoutAnalysis(componentTree)}
${mcpContext ? `## Figma MCP Tools verfuegbar

Du hast Zugriff auf Figma MCP Tools um das Design besser zu verstehen:
- **figma_get_design_context**: Holt strukturierten React-Code-Kontext (Styles, Layout, Hierarchie) fuer einen bestimmten Figma-Node
- **figma_get_metadata**: Holt den Layer-Baum (IDs, Namen, Typen, Positionen) eines Nodes
- **figma_get_screenshot**: Macht einen Screenshot eines Figma-Nodes

Figma File: ${mcpContext.fileKey}, Frame IDs: ${mcpContext.nodeIds.join(', ')}

Nutze diese Tools wenn du mehr Details zu bestimmten Teilen des Designs brauchst — besonders fuer Positionen, Farben und Abstaende.
` : ''}## Component Tree (from Figma, with pre-computed styles)

\`\`\`json
${JSON.stringify(trimmedTree, null, 2)}
\`\`\`

## Design Tokens

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

## PRE-BUILT HMI CHROME (in src/hmi/ — NICHT neu generieren!)

Die folgenden Komponenten sind FERTIG und werden automatisch in \`src/hmi/\` bereitgestellt.
Du MUSST sie importieren und verwenden. Generiere KEINE eigenen Header, Footer, Display oder Icon-Komponenten.
KEINE ABWEICHUNG — diese Komponenten definieren das exakte BMW HMI Layout.

**Verfuegbare Imports (aus Komponenten-Dateien):**
\`\`\`jsx
import BMWIcon from '../hmi/BMWIcons.jsx';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from '../hmi/HMIChrome.jsx';
\`\`\`

**Aus App.jsx (eine Ebene hoeher):**
\`\`\`jsx
import BMWIcon from './hmi/BMWIcons.jsx';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';
\`\`\`

**HMIDisplay** — Parallelogramm-Container (1920x720), auto-skaliert auf Viewport, chamfered corners. ALLES kommt da rein.
**HMIHeader** — Transparente floating Statusleiste: Links Wrench-Icon+Badge, Rechts Bell, Temp, Mute, BT, WiFi, Mic, Avatar-Ring, Uhr.
  Props: \`{ title?, leftIcon?, warningCount?, outdoor? }\`
**HMIFooter** — Klima links + 7 Quick-Action Icons (64x64, radius 16) + Klima rechts.
  Props: \`{ active?, onTab? }\` — active: "media"|"nav"|"phone"|"home"|"fan"|"car"|"apps"
**LeftSideSlot** — Fahrzeug-Icons (Tuer-Schematic, Kamera, Recording-Dot) am linken Rand, geneigt.
**RightSideSlot** — Parallelogramm-Buttons im chamfered Bereich (Settings, Compass/N, Assist View, Park-Assist-Halo).
  Props: \`{ onClose?, showPark? }\`
**MapBackground** — SVG Nacht-Map-Placeholder (dunkle Strassen auf #0F1A2C).
**BMWIcon** — Line-art SVG Icons, 1.75px stroke.
  Props: \`{ name, size?, color?, style? }\`
  Names: note, play, forward, phone, home, fan, car, apps, bell, mute, bluetooth, wifi, mic, wrench, user, triangleAlert, seatbelt, door, minus, plus, seat, park, pin, compass, search, chevronRight, chevronDown, close, bolt, charge, speaker, camera, record, music, settings, arrow, shield

${userPrompt ? `## NUTZER-ANFORDERUNGEN — HOECHSTE PRIORITAET

Der Nutzer hat folgende Beschreibung/Anforderungen angegeben. Diese haben ABSOLUTE PRIORITAET ueber den BMW Design Guide. Wenn der Nutzer etwas verlangt das vom Design Guide abweicht, setze die Nutzer-Anforderung um — OHNE Kompromiss.

> ${userPrompt}

Setze ALLE beschriebenen Interaktionen, Animationen, Verhaltensweisen und visuellen Anforderungen exakt um.
Du DARFST und SOLLST zusaetzliche UI-Elemente erstellen die der Nutzer beschreibt, auch wenn sie NICHT im Wireframe/Component-Tree vorkommen. Erstelle dafuer eigene Komponenten-Dateien.
Der Design Guide ist sekundaer gegenueber diesen Anforderungen.

` : ''}## Your Task

Generate ONLY die Content-Komponenten. Chrome (Display, Header, Footer, SideSlots) ist bereits vorhanden.

Files to create:

${componentNames.map(n => `- ${n}.jsx`).join('\n')}
- App.jsx (root — MUSS HMIDisplay/Header/Footer/SideSlots importieren und verwenden${hasAPIs ? ', wraps in context providers' : ''})

${hasMap ? `## PFLICHT-STRUKTUR fuer App.jsx (INTERACTIVE MAP SCREEN)

\`\`\`jsx
// FILE: App.jsx
import React from 'react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot } from './hmi/HMIChrome.jsx';
// import your content components...

const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? \\\`https://api.maptiler.com/maps/dataviz-dark/style.json?key=\\\${import.meta.env.VITE_MAPTILER_KEY}\\\`
  : { version: 8, sources: { 'carto-dark': { type: 'raster', tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'], tileSize: 256 } }, layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }] };

const App = () => {
  return (
    <HMIDisplay>
      {/* INTERACTIVE MAP — fills entire display as background */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Map
          initialViewState={{ longitude: 11.582, latitude: 48.1351, zoom: 13, pitch: 45 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
        />
      </div>

      {/* CONTENT — position absolute, inset 0, KEIN top/left Offset */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Deine Content-Komponenten hier — jede Komponente setzt pointerEvents: "auto" */}
          {/* Verwende die PFLICHT-POSITIONEN Tabelle! */}
      </div>

      {/* CHROME — IMMER vorhanden, schwebt ueber allem */}
      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={false} />
      <HMIFooter active="nav" />
    </HMIDisplay>
  );
};

export default App;
\`\`\`

**WICHTIG — Interactive Map Screen:**
- Die Map fuellt das gesamte Display (\`position: absolute, inset: 0\`) — NICHT \`<MapBackground />\` verwenden
- Content-Container: \`position: absolute, inset: 0, pointerEvents: "none"\` — KEIN top/left Offset
- Positionen der Elemente INNERHALB des Containers sind relativ zum Content-Bereich (left: 0 = linker Rand)
- KEIN innerer Wrapper-Div mit \`pointerEvents: "auto"\` — stattdessen setzt JEDE Content-Komponente individuell \`pointerEvents: "auto"\` auf sich selbst. So bleibt die Map ueberall klickbar wo kein Panel ist.
- Content-Panels verwenden \`backdrop-filter: blur(8px)\` und semi-transparente Backgrounds
- Verwende die PFLICHT-POSITIONEN Tabelle fuer die Platzierung` : `## PFLICHT-STRUKTUR fuer App.jsx

\`\`\`jsx
// FILE: App.jsx
import React from 'react';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';
// import your content components...

const App = () => {
  return (
    <HMIDisplay>
      {/* Background: MapBackground fuer Map-Screens, oder solid gradient fuer andere */}
      <MapBackground />

      {/* CONTENT — position absolute, inset 0, KEIN top/left Offset */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {/* Deine Content-Komponenten hier */}
      </div>

      {/* CHROME — IMMER vorhanden, KEINE Aenderungen */}
      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={false} />
      <HMIFooter active="home" />
    </HMIDisplay>
  );
};

export default App;
\`\`\``}

## ABSOLUTE POSITIONING RULES (PFLICHT — KEINE AUSNAHMEN)

Der Content-Container hat \`position: absolute; inset: 0\` — KEIN top/left Offset.
Positionen kommen direkt aus dem Figma-Wireframe. NIEMALS top/left Offsets auf den Content-Container setzen.
Verwende die PFLICHT-POSITIONEN Tabelle fuer die Platzierung.
${hasDisplayShape ? `
## DISPLAY-SHAPE WIREFRAME ERKANNT

Das Figma-Wireframe verwendet die BMW Display-Form (Parallelogramm mit abgeschraegten Ecken).
Die Positionen im Component-Tree sind relativ zum vollen 1920x720 Rechteck, NICHT zur sichtbaren Flaeche.

**HMIDisplay hat folgende clip-path Vertices (px):**
- Oben-links: (168, 0) | Oben-rechts: (1824, 0)
- Rechts-mitte: (1920, 580) | Unten-rechts: (1752, 720)
- Unten-links: (96, 720) | Links-mitte: (0, 140)

**KRITISCH — Verwende die Tree-Positionen NICHT als absolute Pixel-Werte.**
Platziere Content NUR innerhalb des Content-Containers mit padding. Elemente die nah am Rand liegen
werden sonst vom clip-path abgeschnitten. Verwende die Tree-Positionen nur als RELATIVES Hinweis
fuer die Anordnung (was links ist, was oben ist, was neben was steht).

**Minimum-Abstaende vom Displayrand (innerhalb HMIDisplay):**
- Links: 200px (wegen LeftSideSlot + Chamfer)
- Rechts: 260px (wegen RightSideSlot + Chamfer)
- Oben: 60px (wegen Header)
- Unten: 100px (wegen Footer)
` : ''}
## REFERENZ — So sieht korrekter BMW HMI Content aus

### Map Screen Content (Referenz-Pattern):
\`\`\`jsx
{/* Search bar — schwebend ueber der Map */}
<div style={{
  position: "absolute", top: 94, left: 200, width: 360,
  background: "rgba(27,42,69,0.85)", backdropFilter: "blur(8px)",
  borderRadius: 4, padding: "12px 18px",
  display: "flex", alignItems: "center", gap: 12,
}}>
  <BMWIcon name="search" size={20} color="#A8B5C8"/>
  <span style={{ fontSize: 18, color: "#8C9BB0" }}>Search</span>
</div>

{/* POI info card — unter der Searchbar */}
<div style={{
  position: "absolute", top: 164, left: 200, width: 360,
  background: "linear-gradient(180deg,#243757,#1B2A45)",
  borderRadius: 4, padding: 20,
  boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
}}>
  <div style={{ fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", color: "#A8B5C8", marginBottom: 8 }}>A9 · Highway</div>
  <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", lineHeight: 1.15 }}>AC Mer Germany GmbH</div>
  <div style={{ fontSize: 16, color: "#A8B5C8", marginTop: 6 }}>Schlossstrasse 14, 80803 Muenchen</div>
  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
    <span style={{ background: "rgba(60,210,120,0.16)", color: "#3CD278", padding: "6px 12px", borderRadius: 999, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" }}>Available</span>
    <span style={{ background: "#1C69D4", color: "#fff", padding: "6px 12px", borderRadius: 999, fontSize: 13 }}>22 kW</span>
  </div>
  <button style={{
    marginTop: 16, width: "100%", background: "#1C69D4", color: "#fff",
    border: 0, borderRadius: 4, padding: "14px 18px", fontSize: 18, cursor: "pointer",
    boxShadow: "0 0 20px rgba(28,105,212,0.5)",
  }}>Start route guidance</button>
</div>
\`\`\`

### Notification List (Referenz-Pattern):
\`\`\`jsx
{/* Label */}
<div style={{ fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", color: "#A8B5C8" }}>Notification overview</div>

{/* Tab strip mit Active-Indicator */}
<div style={{ display: "flex", gap: 32, marginTop: 8, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
  <span style={{ color: "#5BA3FF", fontSize: 22, paddingBottom: 14, position: "relative" }}>
    Notifications
    <span style={{ position: "absolute", left: -2, right: -2, bottom: -2, height: 3, borderRadius: 2, background: "#1C69D4", boxShadow: "0 0 12px rgba(28,105,212,0.9)" }}/>
  </span>
  <span style={{ color: "#fff", fontSize: 22, opacity: 0.7, paddingBottom: 14 }}>Check Control</span>
</div>

{/* Notification card */}
<div style={{
  display: "flex", alignItems: "center", gap: 16,
  background: "linear-gradient(180deg,#243757,#1B2A45)", borderRadius: 12,
  padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
}}>
  <div style={{ width: 44, height: 44, borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    <BMWIcon name="wrench" size={26} color="#F0C040"/>
  </div>
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 20, color: "#fff" }}>High-voltage system fault</div>
    <div style={{ fontSize: 16, color: "#A8B5C8", marginTop: 2 }}>Drive carefully. Visit a Service Partner.</div>
  </div>
  <span style={{ fontSize: 14, color: "#5C6B82" }}>2:48 pm</span>
</div>
\`\`\`

### Media Screen Content (Referenz-Pattern):
\`\`\`jsx
{/* Label */}
<div style={{ fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", color: "#A8B5C8" }}>Media</div>

{/* Grid: Now-Playing + Queue */}
<div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 32, marginTop: 16 }}>
  {/* Now Playing — die EINZIGE warme Karte im ganzen System */}
  <div style={{
    aspectRatio: "1 / 1", borderRadius: 16,
    background: "linear-gradient(135deg,#E25A1C,#E63946 60%,#34538D)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    padding: 16, display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "#fff",
  }}>
    <div style={{ fontSize: 18, opacity: 0.9 }}>Spotify · Now playing</div>
    <div style={{ fontSize: 28, fontWeight: 300, marginTop: 6 }}>Highway State of Mind</div>
    <div style={{ fontSize: 16, opacity: 0.85 }}>Auto Pilot · Long Drive Vol. 2</div>
  </div>

  {/* Queue rows */}
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{
      background: "linear-gradient(180deg,#243757,#1B2A45)",
      borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 8, background: "#1C69D4" }}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: "#A8B5C8", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recently played</div>
        <div style={{ fontSize: 20, color: "#fff" }}>Sunday Drive</div>
      </div>
      <BMWIcon name="play" size={28} color="#fff"/>
    </div>
  </div>
</div>
\`\`\`

## Rules

1. **File format**: Each file starts with \`// FILE: ComponentName.jsx\` then \`// Figma: [type] "[name]"\`
2. **Inline styles only**. No CSS files, no className. CSS vars (\`var(--bmw-blue-500)\`) from \`colors_and_type.css\` are fine.
3. **Layout**: Content innerhalb von HMIDisplay (1920x720 canvas). Position absolute fuer schwebende Elemente. Content-Padding: \`70px 280px 110px 240px\`.
4. **Props**: Each component accepts \`children\` and \`style\` (spread at end for overrides).
5. **ES Modules**: \`import/export\`, no CommonJS.
6. **Functional components**: Use hooks (useState, useEffect, useContext) for state and side effects.
7. **Text content**: Use \`content\` from the tree. If a text node has no content, use plausible German placeholder text for that specific node. NEVER add text nodes that don't exist in the tree.
${rule8}
${rule9}
10. **Touch targets**: All interactive elements >= 64px (minimum 48px for secondary actions).
11. **Icons**: IMMER \`import BMWIcon from '../hmi/BMWIcons.jsx'\` verwenden. KEINE eigenen Icons, KEINE Emoji, KEINE Unicode-Symbole fuer UI-Icons. Nur BMWIcon mit den verfuegbaren \`name\`-Werten.
${userPrompt
    ? `12. **User-requested elements**: Implement everything the user describes in their prompt, even if it is NOT in the component tree. Create additional components as needed. For all other elements, follow the tree — do not invent UI beyond what the tree or the user prompt specifies.`
    : `12. **No hallucinated elements**: ONLY implement UI elements that exist in the component tree. Do NOT add speed displays, route panels, search bars, or any other widget that is not in the wireframe. The tree is the single source of truth.`}
13. **Dark theme**: Background #0A1428. Cards use gradient. Zero white/light backgrounds.
14. **BMW Blue**: #1C69D4 for active states, primary buttons, selected items.
15. **NO EMOJI**: Never. Use BMWIcon for all icon needs.
16. **Card styling**: Cards MUST use \`background: linear-gradient(180deg, #243757 0%, #1B2A45 100%)\` with \`box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)\`. Never flat single-color cards.
17. **Labels**: ALL CAPS labels IMMER mit \`letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 14, color: "#A8B5C8"\`.
18. **Chrome**: KEINE eigenen Header/Footer/SideSlots generieren. NUR die pre-built Komponenten aus \`hmi/\` importieren.
19. **Buttons**: border-radius 4-8px (NICHT 999px ausser Pills/Badges). CTA-Buttons: solid #1C69D4 mit glow shadow.

## CRITICAL — File completeness rules

20. **Every \`// FILE:\` block MUST be a complete, working component** with import, function, JSX, export default.
21. **Every import MUST resolve** — either to a \`// FILE:\` block you generated, OR to \`../hmi/BMWIcons.jsx\` / \`../hmi/HMIChrome.jsx\` (pre-built).
22. **No duplicate merging**: Each file stands alone.
23. **Self-check**: Verify all imports resolve before finishing.

## Output Format

Fenced code blocks, each starting with \`// FILE:\`:

\`\`\`jsx
// FILE: ComponentName.jsx
import React from 'react';
import BMWIcon from '../hmi/BMWIcons.jsx';
// ...
\`\`\`

Now generate all content components, then App.jsx last. App.jsx MUSS die PFLICHT-STRUKTUR verwenden (HMIDisplay > MapBackground/Gradient > Content > Chrome). Dein Content muss EXAKT wie die Referenz-Patterns oben aussehen — gleiche Abstande, gleiche Schriftgrossen, gleiche Farben, gleiche Struktur. KEINE Abweichungen.
`.trim();
}

// ---------------------------------------------------------------------------
// Multi-frame prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a prompt from multiple classified Figma frames.
 * Understands relationships between frames and builds the full HMI context.
 *
 * @param {Array<{tree: object, classification: object, figmaRaw: object}>} frames
 * @param {object} tokens
 * @param {object} apiConfig
 * @param {object} options
 * @param {function} options.describePlacement — from frameClassifier
 * @param {function} options.describeDefaultBackground — from frameClassifier
 * @returns {string} Full prompt text
 */
export function buildMultiFramePrompt(frames, tokens, apiConfig = {}, options = {}, userPrompt = '', mcpContext = null) {
  const { describePlacement, describeDefaultBackground } = options;
  const hasDisplayShape = frames.some(f => f.tree?.hasDisplayShape);
  const cb = frames[0]?.tree?.contentBounds ?? { left: 240, top: 70, width: 1400, height: 540 };

  // Separate fullscreen frames from partial frames
  const fullscreenFrames = frames.filter(f => !f.classification.isPartial);
  const partialFrames = frames.filter(f => f.classification.isPartial);

  // Determine primary screen context
  const primaryContext = fullscreenFrames.length > 0
    ? fullscreenFrames[0].classification.screenContext
    : partialFrames[0]?.classification.screenContext || 'navigation';

  // Collect all component names and types across all frames
  const allNames = new Set();
  const allTypes = new Set();
  for (const f of frames) {
    collectComponentNames(f.tree, allNames);
    collectTypes(f.tree, allTypes);
  }
  const componentNames = [...allNames];
  const usedTypes = [...allTypes];

  // Detect header/footer across ALL frames
  const headerTypes = ['statusBar', 'header', 'navbar'];
  const footerTypes = ['dock', 'footer', 'climateControl'];
  let hasHeader = false;
  let hasFooter = false;
  for (const f of frames) {
    if (hasTypeInTree(f.tree, headerTypes)) hasHeader = true;
    if (hasTypeInTree(f.tree, footerTypes)) hasFooter = true;
  }

  const hasAPIs = apiConfig.hasAPIs;
  const hasMap = apiConfig.promptSections?.some(s => s.includes('MapLibre'));
  const pkgNames = Object.keys(apiConfig.packages || {});

  // Build API sections (same as single-frame)
  const apiSection = hasAPIs ? `
## Available APIs & Services
${apiConfig.promptSections.join('\n\n')}
` : '';

  const serviceLayerSection = hasAPIs ? `
## Service Layer Architecture
Organize API code in separate files:
- \`services/*.js\` — API wrappers
- \`hooks/*.js\` — React custom hooks
- \`context/*.jsx\` — React contexts
` : '';

  // Build frame descriptions
  let frameDescriptions = '';
  for (let i = 0; i < frames.length; i++) {
    const { tree, classification } = frames[i];
    const trimmed = trimTree(tree);
    const placement = describePlacement ? describePlacement(classification) : '';
    const frameNames = [...collectComponentNames(tree)];

    frameDescriptions += `
### Frame ${i + 1}: "${classification.frameName}" — ${classification.frameType}

${placement}

**Komponenten:** ${frameNames.join(', ')}
**Erkannte Typen:** ${[...collectTypes(tree)].join(', ')}
**Dimensionen:** ${classification.dimensions.width}×${classification.dimensions.height}px

\`\`\`json
${JSON.stringify(trimmed, null, 2)}
\`\`\`

`;
  }

  // Build background context for partial frames
  let backgroundSection = '';
  if (partialFrames.length > 0 && fullscreenFrames.length === 0) {
    const bgContext = describeDefaultBackground
      ? describeDefaultBackground(partialFrames[0].classification)
      : 'Der Hintergrund ist der BMW Standard-Canvas (#0A1428).';

    backgroundSection = `
## Hintergrund-Kontext (automatisch generiert)

Die Wireframes enthalten keinen vollständigen Bildschirm. Du musst den gesamten HMI-Screen aufbauen und die Wireframe-Inhalte an der richtigen Position einsetzen.

${bgContext}

Das vollständige HMI-Layout muss generiert werden:
- Vollflächiger Hintergrund (1920×720px) mit dem passenden Screen-Kontext
- Standard BMW HMI Header (48px) und Footer mit Klima + Quick-Actions (96px)
- Die Wireframe-Inhalte werden an der beschriebenen Position platziert
- Alles drumherum wird aus dem BMW HMI Design System aufgebaut
`;
  }

  // Build relationship section for multi-frame
  let relationshipSection = '';
  if (frames.length > 1) {
    relationshipSection = `
## Frame-Zusammenhänge

Diese ${frames.length} Frames gehören zusammen und bilden EIN vollständiges UI:
${frames.map((f, i) => `${i + 1}. **"${f.classification.frameName}"** → ${f.classification.frameType} (${f.classification.placement})`).join('\n')}

${fullscreenFrames.length > 0
  ? `Der Hauptbildschirm ist Frame "${fullscreenFrames[0].classification.frameName}". Die anderen Frames werden darauf platziert:`
  : `Kein Frame ist ein vollständiger Bildschirm. Baue den gesamten HMI-Screen auf und platziere die Frames:`}
${partialFrames.map(f => `- "${f.classification.frameName}" → ${describePlacement ? describePlacement(f.classification) : f.classification.placement}`).join('\n')}

**App.jsx** muss alle Frames in einer einzigen Komposition vereinen. Verwende \`position: relative\` auf dem Root-Container und \`position: absolute\` für Overlays/Popups.
${partialFrames.some(f => f.classification.frameType === 'popup' || f.classification.frameType === 'modal')
  ? 'Popups/Modals verwenden useState zum Öffnen/Schließen. Zeige sie initial als geöffnet.'
  : ''}
`;
  }

  const rule8 = hasAPIs
    ? `8. **External libraries**: Use ONLY React and these packages (already in package.json): ${pkgNames.join(', ') || 'none — only browser fetch()'}. For API calls use the browser's built-in \`fetch()\`. No additional npm packages.`
    : `8. **No external libraries**: Only React. No framer-motion, no MUI, no map libraries.`;
  const rule9 = hasMap
    ? `9. **Map**: react-map-gl/maplibre + MapTiler Dark vector tiles. Float controls with position absolute. Custom Marker components.`
    : `9. **Map placeholder**: Dark containers (#0F1A2C) with gradients. No real maps.`;

  const wireframeScope = userPrompt
    ? `Implement the elements present in the wireframe as a BMW infotainment screen (Operating System X / Panoramic Vision style). Additionally, implement any UI elements or features the user explicitly describes in their prompt — even if they do not appear in the component tree.`
    : `Implement ONLY the elements present in the wireframe as a BMW infotainment screen (Operating System X / Panoramic Vision style). Do not add, invent, or hallucinate any UI elements that are not in the component tree.`;

  return `
You are a senior React engineer building a BMW in-car HMI interface. Generate a complete, working React application from ${frames.length > 1 ? `${frames.length} Figma wireframes` : 'a Figma wireframe'} that faithfully implements the wireframe. ${wireframeScope}

${frames.length > 1 ? `**MULTI-FRAME INPUT:** Du erhältst ${frames.length} Figma-Frames die zusammengehören. Analysiere die Zusammenhänge und baue EIN einheitliches UI.` : ''}
${partialFrames.length > 0 ? `**PARTIAL WIREFRAME:** ${partialFrames.length === frames.length ? 'Alle' : 'Einige'} Frames sind keine vollständigen Screens. Der fehlende HMI-Kontext wird durch pre-built Chrome-Komponenten bereitgestellt.` : ''}

## BMW HMI DESIGN SYSTEM — VERBINDLICH

(Alle Regeln aus dem BMW HMI Design System gelten — siehe Design Tokens unten.)

### Kurzreferenz — Die wichtigsten Werte

**Surfaces (NIEMALS neutral-schwarz):**
Canvas #0A1428 | Elevated #1B2A45 | Elevated-Alt #243757 | Strong #2A4170

**Card-Gradient:** \`linear-gradient(180deg, #243757 0%, #1B2A45 100%)\` + \`box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)\`

**BMW Blue:** #1C69D4 (base) | #2D7AE8 (hover) | #1656B0 (pressed)
**Text:** #FFFFFF | #A8B5C8 | #5C6B82 | #3D4A60
**Status:** Warning #F0C040 | Danger #E63946 | Success #3CD278 | Info #5BA3FF
**Font:** "BMW Type Next", "Inter", system-ui, sans-serif
**Touch:** ≥ 64px | Layout: Header 48px, Footer 96px, Side 80px
**Radius:** Buttons 8px | Cards 12-16px | Search 24px | Pills 999px
**Motion:** 150-250ms, cubic-bezier(0.4, 0, 0.2, 1) — keine Springs/Bounces
**Icons:** Outline/Line-Art SVG, 1.75-2px stroke, 24px. KEINE EMOJI.
${backgroundSection}${relationshipSection}
## Wireframe-Daten

${frames.length === 1 ? `Component types: ${usedTypes.join(', ')}` : ''}
${hasAPIs ? `Dynamic services: ${apiConfig.detectedServices.join(', ')}` : ''}
${apiSection}${serviceLayerSection}
${frames.map(f => buildContentLayoutAnalysis(f.tree)).filter(Boolean).join('\n')}
${frameDescriptions}
${mcpContext ? `
## Figma MCP Tools verfuegbar

Du hast Zugriff auf Figma MCP Tools um das Design besser zu verstehen:
- **figma_get_design_context**: Holt strukturierten React-Code-Kontext (Styles, Layout, Hierarchie) fuer einen bestimmten Figma-Node
- **figma_get_metadata**: Holt den Layer-Baum (IDs, Namen, Typen, Positionen) eines Nodes
- **figma_get_screenshot**: Macht einen Screenshot eines Figma-Nodes

Figma File: ${mcpContext.fileKey}, Frame IDs: ${mcpContext.nodeIds.join(', ')}

Nutze diese Tools wenn du mehr Details zu bestimmten Teilen des Designs brauchst — besonders fuer Positionen, Farben und Abstaende.
` : ''}
## Design Tokens

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

## PRE-BUILT HMI CHROME (in src/hmi/ — NICHT neu generieren!)

Die folgenden Komponenten sind FERTIG und werden automatisch in \`src/hmi/\` bereitgestellt.
Du MUSST sie importieren und verwenden. Generiere KEINE eigenen Header, Footer, Display oder Icon-Komponenten.
KEINE ABWEICHUNG — diese Komponenten definieren das exakte BMW HMI Layout.

**Verfuegbare Imports (aus Komponenten-Dateien):**
\`\`\`jsx
import BMWIcon from '../hmi/BMWIcons.jsx';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from '../hmi/HMIChrome.jsx';
\`\`\`

**Aus App.jsx (eine Ebene hoeher):**
\`\`\`jsx
import BMWIcon from './hmi/BMWIcons.jsx';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';
\`\`\`

**HMIDisplay** — Parallelogramm-Container (1920x720), auto-skaliert auf Viewport, chamfered corners. ALLES kommt da rein.
**HMIHeader** — Transparente floating Statusleiste: Links Wrench-Icon+Badge, Rechts Bell, Temp, Mute, BT, WiFi, Mic, Avatar-Ring, Uhr.
  Props: \`{ title?, leftIcon?, warningCount?, outdoor? }\`
**HMIFooter** — Klima links + 7 Quick-Action Icons (64x64, radius 16) + Klima rechts.
  Props: \`{ active?, onTab? }\` — active: "media"|"nav"|"phone"|"home"|"fan"|"car"|"apps"
**LeftSideSlot** — Fahrzeug-Icons (Tuer-Schematic, Kamera, Recording-Dot) am linken Rand, geneigt.
**RightSideSlot** — Parallelogramm-Buttons im chamfered Bereich (Settings, Compass/N, Assist View, Park-Assist-Halo).
  Props: \`{ onClose?, showPark? }\`
**MapBackground** — SVG Nacht-Map-Placeholder (dunkle Strassen auf #0F1A2C).
**BMWIcon** — Line-art SVG Icons, 1.75px stroke.
  Props: \`{ name, size?, color?, style? }\`
  Names: note, play, forward, phone, home, fan, car, apps, bell, mute, bluetooth, wifi, mic, wrench, user, triangleAlert, seatbelt, door, minus, plus, seat, park, pin, compass, search, chevronRight, chevronDown, close, bolt, charge, speaker, camera, record, music, settings, arrow, shield

${userPrompt ? `## NUTZER-ANFORDERUNGEN — HOECHSTE PRIORITAET

Der Nutzer hat folgende Beschreibung/Anforderungen angegeben. Diese haben ABSOLUTE PRIORITAET ueber den BMW Design Guide. Wenn der Nutzer etwas verlangt das vom Design Guide abweicht, setze die Nutzer-Anforderung um — OHNE Kompromiss.

> ${userPrompt}

Setze ALLE beschriebenen Interaktionen, Animationen, Verhaltensweisen und visuellen Anforderungen exakt um.
Du DARFST und SOLLST zusaetzliche UI-Elemente erstellen die der Nutzer beschreibt, auch wenn sie NICHT im Wireframe/Component-Tree vorkommen. Erstelle dafuer eigene Komponenten-Dateien.
Der Design Guide ist sekundaer gegenueber diesen Anforderungen.

` : ''}## Your Task

Generate ONLY die Content-Komponenten. Chrome (Display, Header, Footer, SideSlots) ist bereits vorhanden.

Files to create:

${componentNames.map(n => `- ${n}.jsx`).join('\n')}
- App.jsx (root — MUSS HMIDisplay/Header/Footer/SideSlots importieren und verwenden${hasAPIs ? ', wraps in context providers' : ''})

${hasMap ? `## PFLICHT-STRUKTUR fuer App.jsx (INTERACTIVE MAP SCREEN)

\`\`\`jsx
// FILE: App.jsx
import React from 'react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot } from './hmi/HMIChrome.jsx';
// import your content components...

const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? \\\`https://api.maptiler.com/maps/dataviz-dark/style.json?key=\\\${import.meta.env.VITE_MAPTILER_KEY}\\\`
  : { version: 8, sources: { 'carto-dark': { type: 'raster', tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'], tileSize: 256 } }, layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }] };

const App = () => {
  return (
    <HMIDisplay>
      {/* INTERACTIVE MAP — fills entire display as background */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Map
          initialViewState={{ longitude: 11.582, latitude: 48.1351, zoom: 13, pitch: 45 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
        />
      </div>

      {/* CONTENT — position absolute, inset 0, KEIN top/left Offset */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Deine Content-Komponenten hier — jede Komponente setzt pointerEvents: "auto" */}
      </div>

      {/* CHROME */}
      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={false} />
      <HMIFooter active="nav" />
    </HMIDisplay>
  );
};

export default App;
\`\`\`` : `## PFLICHT-STRUKTUR fuer App.jsx

\`\`\`jsx
// FILE: App.jsx
import React from 'react';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';

const App = () => {
  return (
    <HMIDisplay>
      <MapBackground />
      <div style={{ position: "absolute", top: ${cb.top}, left: ${cb.left}, width: ${cb.width}, height: ${cb.height}, overflow: "hidden" }}>
        {/* Deine Content-Komponenten hier */}
      </div>
      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={false} />
      <HMIFooter active="home" />
    </HMIDisplay>
  );
};

export default App;
\`\`\``}

## ABSOLUTE POSITIONING RULES (PFLICHT)

Der Content-Container hat \`position: absolute; inset: 0\` — KEIN top/left Offset.
Positionen kommen direkt aus dem Figma-Wireframe. NIEMALS top/left Offsets auf den Content-Container setzen.
Verwende die PFLICHT-POSITIONEN Tabelle fuer die Platzierung.
${frames.length > 1 ? `- **Multi-Frame:** Alle ${frames.length} Frames werden in EINER App.jsx vereint.` : ''}
${partialFrames.some(f => f.classification.frameType === 'popup' || f.classification.frameType === 'modal')
  ? '- Popups/Modals verwenden useState zum Oeffnen/Schliessen. Zeige sie initial als geoeffnet.'
  : ''}
${hasDisplayShape ? `
## DISPLAY-SHAPE WIREFRAME ERKANNT

Das Figma-Wireframe verwendet die BMW Display-Form (Parallelogramm mit abgeschraegten Ecken).
Die Positionen im Component-Tree sind relativ zum vollen 1920x720 Rechteck, NICHT zur sichtbaren Flaeche.

**HMIDisplay hat folgende clip-path Vertices (px):**
- Oben-links: (168, 0) | Oben-rechts: (1824, 0)
- Rechts-mitte: (1920, 580) | Unten-rechts: (1752, 720)
- Unten-links: (96, 720) | Links-mitte: (0, 140)

**KRITISCH — Verwende die Tree-Positionen NICHT als absolute Pixel-Werte.**
Platziere Content NUR innerhalb des Content-Containers mit padding. Elemente die nah am Rand liegen
werden sonst vom clip-path abgeschnitten. Verwende die Tree-Positionen nur als RELATIVES Hinweis
fuer die Anordnung (was links ist, was oben ist, was neben was steht).

**Minimum-Abstaende vom Displayrand (innerhalb HMIDisplay):**
- Links: 200px (wegen LeftSideSlot + Chamfer)
- Rechts: 260px (wegen RightSideSlot + Chamfer)
- Oben: 60px (wegen Header)
- Unten: 100px (wegen Footer)
` : ''}
## REFERENZ — So sieht korrekter BMW HMI Content aus

### Map Screen Content (Referenz-Pattern):
\`\`\`jsx
{/* Search bar — schwebend ueber der Map */}
<div style={{
  position: "absolute", top: 94, left: 200, width: 360,
  background: "rgba(27,42,69,0.85)", backdropFilter: "blur(8px)",
  borderRadius: 4, padding: "12px 18px",
  display: "flex", alignItems: "center", gap: 12,
}}>
  <BMWIcon name="search" size={20} color="#A8B5C8"/>
  <span style={{ fontSize: 18, color: "#8C9BB0" }}>Search</span>
</div>

{/* POI info card */}
<div style={{
  position: "absolute", top: 164, left: 200, width: 360,
  background: "linear-gradient(180deg,#243757,#1B2A45)",
  borderRadius: 4, padding: 20,
  boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
}}>
  <div style={{ fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", color: "#A8B5C8", marginBottom: 8 }}>A9 · Highway</div>
  <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", lineHeight: 1.15 }}>AC Mer Germany GmbH</div>
  <div style={{ fontSize: 16, color: "#A8B5C8", marginTop: 6 }}>Schlossstrasse 14, 80803 Muenchen</div>
</div>
\`\`\`

### Notification List (Referenz-Pattern):
\`\`\`jsx
{/* Notification card */}
<div style={{
  display: "flex", alignItems: "center", gap: 16,
  background: "linear-gradient(180deg,#243757,#1B2A45)", borderRadius: 12,
  padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
}}>
  <div style={{ width: 44, height: 44, borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    <BMWIcon name="wrench" size={26} color="#F0C040"/>
  </div>
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 20, color: "#fff" }}>High-voltage system fault</div>
    <div style={{ fontSize: 16, color: "#A8B5C8", marginTop: 2 }}>Drive carefully. Visit a Service Partner.</div>
  </div>
  <span style={{ fontSize: 14, color: "#5C6B82" }}>2:48 pm</span>
</div>
\`\`\`

## Rules

1. **File format**: Each file starts with \`// FILE: ComponentName.jsx\` then \`// Figma: [type] "[name]"\`
2. **Inline styles only**. No CSS files, no className. CSS vars (\`var(--bmw-blue-500)\`) from \`colors_and_type.css\` are fine.
3. **Layout**: Content innerhalb von HMIDisplay (1920x720 canvas). Position absolute fuer schwebende Elemente. Content-Padding: \`70px 280px 110px 240px\`.
4. **Props**: Each component accepts \`children\` and \`style\` (spread at end for overrides).
5. **ES Modules**: \`import/export\`, no CommonJS.
6. **Functional components**: Use hooks (useState, useEffect, useContext) for state and side effects.
7. **Text content**: Use \`content\` from the tree. If a text node has no content, use plausible German placeholder text for that specific node. NEVER add text nodes that don't exist in the tree.
${rule8}
${rule9}
10. **Touch targets**: All interactive elements >= 64px (minimum 48px for secondary actions).
11. **Icons**: IMMER \`import BMWIcon from '../hmi/BMWIcons.jsx'\` verwenden. KEINE eigenen Icons, KEINE Emoji, KEINE Unicode-Symbole fuer UI-Icons. Nur BMWIcon mit den verfuegbaren \`name\`-Werten.
${userPrompt
    ? `12. **User-requested elements**: Implement everything the user describes in their prompt, even if it is NOT in the component tree. Create additional components as needed. For all other elements, follow the tree — do not invent UI beyond what the tree or the user prompt specifies.`
    : `12. **No hallucinated elements**: ONLY implement UI elements that exist in the component tree. Do NOT add speed displays, route panels, search bars, or any other widget that is not in the wireframe. The tree is the single source of truth.`}
13. **Dark theme**: Background #0A1428. Cards use gradient. Zero white/light backgrounds.
14. **BMW Blue**: #1C69D4 for active states, primary buttons, selected items.
15. **NO EMOJI**: Never. Use BMWIcon for all icon needs.
16. **Card styling**: Cards MUST use \`background: linear-gradient(180deg, #243757 0%, #1B2A45 100%)\` with \`box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)\`. Never flat single-color cards.
17. **Labels**: ALL CAPS labels IMMER mit \`letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 14, color: "#A8B5C8"\`.
18. **Chrome**: KEINE eigenen Header/Footer/SideSlots generieren. NUR die pre-built Komponenten aus \`hmi/\` importieren.
19. **Buttons**: border-radius 4-8px (NICHT 999px ausser Pills/Badges). CTA-Buttons: solid #1C69D4 mit glow shadow.

## CRITICAL — File completeness rules

20. **Every \`// FILE:\` block MUST be a complete, working component** with import, function, JSX, export default.
21. **Every import MUST resolve** — either to a \`// FILE:\` block you generated, OR to \`../hmi/BMWIcons.jsx\` / \`../hmi/HMIChrome.jsx\` (pre-built).
22. **No duplicate merging**: Each file stands alone.
23. **Self-check**: Verify all imports resolve before finishing.

## Output Format

\`\`\`jsx
// FILE: ComponentName.jsx
import React from 'react';
import BMWIcon from '../hmi/BMWIcons.jsx';
// ...
\`\`\`

Now generate all content components, then App.jsx last. App.jsx MUSS die PFLICHT-STRUKTUR verwenden (HMIDisplay > MapBackground/Gradient > Content > Chrome). Dein Content muss EXAKT wie die Referenz-Patterns oben aussehen — gleiche Abstande, gleiche Schriftgrossen, gleiche Farben, gleiche Struktur. KEINE Abweichungen. ${frames.length > 1 ? 'Vereinige alle Frames zu einem kohaerenten HMI-Screen.' : ''}
`.trim();
}

