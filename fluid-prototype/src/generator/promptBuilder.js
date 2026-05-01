/**
 * Phase 4b — Prompt Builder
 *
 * Builds the structured prompt for Claude to generate React components
 * for a BMW center console screen from a Figma wireframe.
 * Design rules are imported from the central knowledge module.
 */

import { getRulesForFrontend } from '../knowledge/bmwDesignSystem.js';

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
// App.jsx templates
// ---------------------------------------------------------------------------

const MAP_APP_TEMPLATE = `\`\`\`jsx
// FILE: App.jsx
import React from 'react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot } from './hmi/HMIChrome.jsx';

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

      {/* CHROME — IMMER vorhanden, schwebt ueber allem */}
      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={false} />
      <HMIFooter active="nav" />
    </HMIDisplay>
  );
};

export default App;
\`\`\``;

const STATIC_APP_TEMPLATE = `\`\`\`jsx
// FILE: App.jsx
import React from 'react';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';

const App = () => {
  return (
    <HMIDisplay>
      <MapBackground />
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
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
\`\`\``;

// ---------------------------------------------------------------------------
// Reference patterns
// ---------------------------------------------------------------------------

const REFERENCE_PATTERNS = `## REFERENZ — So sieht korrekter BMW HMI Content aus

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
\`\`\``;

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a structured prompt for Claude to generate React components.
 * @param {object} componentTree — Phase 3 output (tree with .style applied)
 * @param {object} tokens        — raw tokens object
 * @param {object} apiConfig     — resolved API config from apiRegistry
 * @param {string} userPrompt
 * @param {object} mcpContext
 * @param {string} plan          — implementation plan from Planning Agent
 * @returns {string} Full prompt text
 */
export function buildGenerationPrompt(componentTree, tokens, apiConfig = {}, userPrompt = '', mcpContext = null, plan = '') {
  const trimmedTree    = trimTree(componentTree);
  const componentNames = [...collectComponentNames(componentTree)];
  const usedTypes      = [...collectTypes(componentTree)];
  const hasDisplayShape = componentTree.hasDisplayShape === true;

  const hasAPIs    = apiConfig.hasAPIs;
  const hasMap     = apiConfig.promptSections?.some(s => s.includes('MapLibre'));
  const pkgNames   = Object.keys(apiConfig.packages || {});

  const rule8 = hasAPIs
    ? `8. **External libraries**: Use ONLY React and these packages (already in package.json): ${pkgNames.join(', ') || 'none'}. No additional npm packages.`
    : `8. **No external libraries**: Only React. No framer-motion, no MUI, no map libraries.`;

  const rule9 = hasMap
    ? `9. **Map**: react-map-gl/maplibre + MapTiler Dark vector tiles. Float controls with position absolute. Custom Marker components.`
    : `9. **Map placeholder**: Dark containers (#0F1A2C) with gradients. No real maps.`;

  const apiSection = hasAPIs ? `
## Available APIs & Services

${apiConfig.promptSections.join('\n\n')}
` : '';

  const wireframeScope = userPrompt
    ? `Additionally, implement any UI elements or features the user explicitly describes — even if they do not appear in the component tree.`
    : `Do NOT add, invent, or hallucinate any UI elements that are not in the component tree.`;

  return `
You are building a BMW in-car HMI interface (1920x720, Operating System X / Panoramic Vision style). Generate a complete, working React application from a Figma wireframe. ${wireframeScope}

${plan ? `## Implementation Plan (from Planning Agent)\n\n${plan}\n\n` : ''}## BMW HMI Design System

${getRulesForFrontend()}

## Context

Screen specification:
- **Resolution**: 1920x720 pixels (widescreen, ~2.67:1 aspect ratio)
- **Display**: Dark theme with blue-tinted surfaces, chamfered bottom-right corner
- **Interaction**: Touch-only (generous touch targets of 64px+)

Component types in this wireframe: ${usedTypes.join(', ')}
${hasAPIs ? `Dynamic services: ${apiConfig.detectedServices.join(', ')}` : ''}
${apiSection}
${buildContentLayoutAnalysis(componentTree)}
${mcpContext ? `## Figma MCP Tools verfuegbar

Du hast Zugriff auf Figma MCP Tools:
- **figma_get_design_context**: Holt React-Code-Kontext fuer einen Figma-Node
- **figma_get_metadata**: Holt den Layer-Baum eines Nodes
- **figma_get_screenshot**: Macht einen Screenshot eines Nodes

Figma File: ${mcpContext.fileKey}, Frame IDs: ${mcpContext.nodeIds.join(', ')}
` : ''}## Component Tree (from Figma, with pre-computed styles)

\`\`\`json
${JSON.stringify(trimmedTree, null, 2)}
\`\`\`

## Design Tokens

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

${userPrompt ? `## NUTZER-ANFORDERUNGEN — HOECHSTE PRIORITAET

Der Nutzer hat folgende Beschreibung/Anforderungen angegeben. Diese haben ABSOLUTE PRIORITAET ueber den BMW Design Guide.

> ${userPrompt}

Setze ALLE beschriebenen Interaktionen, Animationen, Verhaltensweisen und visuellen Anforderungen exakt um.
Du DARFST zusaetzliche UI-Elemente erstellen die der Nutzer beschreibt, auch wenn sie NICHT im Wireframe vorkommen.

` : ''}## Your Task

Generate ONLY die Content-Komponenten. Chrome (Display, Header, Footer, SideSlots) ist bereits vorhanden.

Files to create:

${componentNames.map(n => `- ${n}.jsx`).join('\n')}
- App.jsx (root — MUSS HMIDisplay/Header/Footer/SideSlots importieren${hasAPIs ? ', wraps in context providers' : ''})

${hasMap ? `## PFLICHT-STRUKTUR fuer App.jsx (INTERACTIVE MAP SCREEN)

${MAP_APP_TEMPLATE}

**WICHTIG — Interactive Map Screen:**
- Die Map fuellt das gesamte Display (\`position: absolute, inset: 0\`) — NICHT \`<MapBackground />\` verwenden
- Content-Container: \`position: absolute, inset: 0, pointerEvents: "none"\` — KEIN top/left Offset
- KEIN innerer Wrapper-Div mit \`pointerEvents: "auto"\` — JEDE Content-Komponente setzt es individuell
- Content-Panels verwenden \`backdrop-filter: blur(8px)\` und semi-transparente Backgrounds` : `## PFLICHT-STRUKTUR fuer App.jsx

${STATIC_APP_TEMPLATE}`}

## ABSOLUTE POSITIONING RULES (PFLICHT)

Der Content-Container hat \`position: absolute; inset: 0\` — KEIN top/left Offset.
Positionen kommen direkt aus dem Figma-Wireframe. NIEMALS top/left Offsets auf den Content-Container setzen.
${hasDisplayShape ? `
## DISPLAY-SHAPE WIREFRAME ERKANNT

Das Figma-Wireframe verwendet die BMW Display-Form (Parallelogramm mit abgeschraegten Ecken).
HMIDisplay clip-path Vertices: (168,0) (1824,0) (1920,580) (1752,720) (96,720) (0,140).
Platziere Content innerhalb des Content-Containers. Minimum-Abstaende: Links 200px, Rechts 260px, Oben 60px, Unten 100px.
` : ''}
${REFERENCE_PATTERNS}

## Rules

1. **File format**: Each file starts with \`// FILE: ComponentName.jsx\`
2. **Inline styles only**. No CSS files, no className.
3. **Layout**: Content innerhalb von HMIDisplay (1920x720 canvas). Position absolute fuer schwebende Elemente.
4. **Props**: Each component accepts \`children\` and \`style\` (spread at end for overrides).
5. **ES Modules**: \`import/export\`, no CommonJS.
6. **Functional components**: Use hooks for state and side effects.
7. **Text content**: Use \`content\` from the tree. No additional text nodes.
${rule8}
${rule9}
10. **Touch targets**: All interactive elements >= 64px.
11. **Icons**: IMMER \`BMWIcon\` verwenden. KEINE eigenen Icons, Emoji, oder Unicode-Symbole.
${userPrompt
    ? `12. **User-requested elements**: Implement everything the user describes, even if not in the tree.`
    : `12. **No hallucinated elements**: ONLY implement UI elements from the component tree.`}
13. **Chrome**: KEINE eigenen Header/Footer/SideSlots. NUR pre-built Komponenten aus \`hmi/\`.

## CRITICAL — File completeness rules

14. **Every \`// FILE:\` block MUST be complete** (import, function, JSX, export default).
15. **Every import MUST resolve** to a generated file or pre-built hmi/ component.
16. **Self-check**: Verify all imports resolve before finishing.

Now generate all content components, then App.jsx last. App.jsx MUSS die PFLICHT-STRUKTUR verwenden. Content muss wie die Referenz-Patterns aussehen.
`.trim();
}

// ---------------------------------------------------------------------------
// Multi-frame prompt builder
// ---------------------------------------------------------------------------

export function buildMultiFramePrompt(frames, tokens, apiConfig = {}, options = {}, userPrompt = '', mcpContext = null, plan = '') {
  const { describePlacement, describeDefaultBackground } = options;
  const hasDisplayShape = frames.some(f => f.tree?.hasDisplayShape);

  const fullscreenFrames = frames.filter(f => !f.classification.isPartial);
  const partialFrames = frames.filter(f => f.classification.isPartial);

  const allNames = new Set();
  const allTypes = new Set();
  for (const f of frames) {
    collectComponentNames(f.tree, allNames);
    collectTypes(f.tree, allTypes);
  }
  const componentNames = [...allNames];
  const usedTypes = [...allTypes];

  const hasAPIs = apiConfig.hasAPIs;
  const hasMap = apiConfig.promptSections?.some(s => s.includes('MapLibre'));
  const pkgNames = Object.keys(apiConfig.packages || {});

  const apiSection = hasAPIs ? `
## Available APIs & Services
${apiConfig.promptSections.join('\n\n')}
` : '';

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
**Dimensionen:** ${classification.dimensions.width}x${classification.dimensions.height}px

\`\`\`json
${JSON.stringify(trimmed, null, 2)}
\`\`\`

`;
  }

  let backgroundSection = '';
  if (partialFrames.length > 0 && fullscreenFrames.length === 0) {
    const bgContext = describeDefaultBackground
      ? describeDefaultBackground(partialFrames[0].classification)
      : 'Der Hintergrund ist der BMW Standard-Canvas (#0A1428).';
    backgroundSection = `
## Hintergrund-Kontext

Die Wireframes enthalten keinen vollstaendigen Bildschirm. Baue den gesamten HMI-Screen auf.
${bgContext}
`;
  }

  let relationshipSection = '';
  if (frames.length > 1) {
    relationshipSection = `
## Frame-Zusammenhaenge

Diese ${frames.length} Frames bilden EIN vollstaendiges UI:
${frames.map((f, i) => `${i + 1}. **"${f.classification.frameName}"** → ${f.classification.frameType} (${f.classification.placement})`).join('\n')}

**App.jsx** muss alle Frames in einer einzigen Komposition vereinen.
`;
  }

  const rule8 = hasAPIs
    ? `8. **External libraries**: Use ONLY React and: ${pkgNames.join(', ') || 'none'}.`
    : `8. **No external libraries**: Only React.`;
  const rule9 = hasMap
    ? `9. **Map**: react-map-gl/maplibre + MapTiler Dark. Custom Markers.`
    : `9. **Map placeholder**: Dark containers (#0F1A2C). No real maps.`;

  const wireframeScope = userPrompt
    ? `Additionally, implement any UI elements the user explicitly describes.`
    : `Do NOT add UI elements that are not in the component tree.`;

  return `
You are building a BMW in-car HMI interface from ${frames.length > 1 ? `${frames.length} Figma wireframes` : 'a Figma wireframe'}. ${wireframeScope}

${plan ? `## Implementation Plan (from Planning Agent)\n\n${plan}\n\n` : ''}## BMW HMI Design System

${getRulesForFrontend()}
${backgroundSection}${relationshipSection}
## Wireframe-Daten

${frames.length === 1 ? `Component types: ${usedTypes.join(', ')}` : ''}
${hasAPIs ? `Dynamic services: ${apiConfig.detectedServices.join(', ')}` : ''}
${apiSection}
${frames.map(f => buildContentLayoutAnalysis(f.tree)).filter(Boolean).join('\n')}
${frameDescriptions}
${mcpContext ? `## Figma MCP Tools verfuegbar

Figma File: ${mcpContext.fileKey}, Frame IDs: ${mcpContext.nodeIds.join(', ')}
` : ''}
## Design Tokens

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

${userPrompt ? `## NUTZER-ANFORDERUNGEN — HOECHSTE PRIORITAET

> ${userPrompt}

Setze ALLE beschriebenen Anforderungen exakt um. Der Design Guide ist sekundaer.

` : ''}## Your Task

Files to create:

${componentNames.map(n => `- ${n}.jsx`).join('\n')}
- App.jsx (root — MUSS HMIDisplay/Header/Footer/SideSlots importieren${hasAPIs ? ', wraps in context providers' : ''})

${hasMap ? `## PFLICHT-STRUKTUR fuer App.jsx (INTERACTIVE MAP SCREEN)

${MAP_APP_TEMPLATE}` : `## PFLICHT-STRUKTUR fuer App.jsx

${STATIC_APP_TEMPLATE}`}

## ABSOLUTE POSITIONING RULES (PFLICHT)

Der Content-Container hat \`position: absolute; inset: 0\` — KEIN top/left Offset.
${hasDisplayShape ? `
## DISPLAY-SHAPE WIREFRAME ERKANNT

HMIDisplay clip-path: (168,0) (1824,0) (1920,580) (1752,720) (96,720) (0,140).
Minimum-Abstaende: Links 200px, Rechts 260px, Oben 60px, Unten 100px.
` : ''}
${REFERENCE_PATTERNS}

## Rules

1. **File format**: \`// FILE: ComponentName.jsx\`
2. **Inline styles only**.
3. **Layout**: Content in HMIDisplay (1920x720). Position absolute fuer schwebende Elemente.
4. **Props**: Accept \`children\` and \`style\`.
5. **ES Modules**: \`import/export\`, no CommonJS.
6. **Functional components**: Hooks for state/effects.
7. **Text**: Use \`content\` from tree. No extra text nodes.
${rule8}
${rule9}
10. **Touch targets**: >= 64px.
11. **Icons**: Only \`BMWIcon\`. No emoji, no Unicode symbols.
${userPrompt
    ? `12. **User elements**: Implement user-described elements even if not in tree.`
    : `12. **No hallucination**: Only elements from component tree.`}
13. **Chrome**: No custom Header/Footer/SideSlots — only pre-built from hmi/.
14. **Complete files**: Every // FILE: block must be runnable.
15. **Imports resolve**: Every import must resolve.

Now generate all content components, then App.jsx last.
`.trim();
}
