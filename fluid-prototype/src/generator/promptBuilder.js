/**
 * Phase 4a — Prompt Builder (BMW iDrive Navigation)
 *
 * Builds the structured prompt for Claude to generate React components
 * for a BMW center console navigation screen from a Figma wireframe.
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

function collectComponentNames(node, names = new Set()) {
  names.add(toPascalCase(node.label));
  for (const child of node.children ?? []) collectComponentNames(child, names);
  return names;
}

function collectTypes(node, types = new Set()) {
  types.add(node.type);
  for (const child of node.children ?? []) collectTypes(child, types);
  return types;
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

// ---------------------------------------------------------------------------
// Example component
// ---------------------------------------------------------------------------

const EXAMPLE_COMPONENT = `
// FILE: DockItem.jsx
import React, { useState } from 'react';

const DockItem = ({ icon, label, active, onClick, style: overrideStyle }) => {
  const [hovered, setHovered] = useState(false);

  const style = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: active ? '#1C69D4' : (hovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'),
    cursor: 'pointer',
    padding: '0.5rem',
    minWidth: '3.75rem',
    minHeight: '3.75rem',
    borderRadius: '0.75rem',
    backgroundColor: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
    fontSize: '0.75rem',
    fontWeight: '500',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", sans-serif',
    transition: 'color 0.15s ease-out, background-color 0.15s ease-out',
    border: 'none',
    boxSizing: 'border-box',
    ...overrideStyle,
  };

  const iconStyle = { fontSize: '1.5rem', lineHeight: '1' };

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={iconStyle}>{icon}</span>
      {label && <span>{label}</span>}
    </button>
  );
};

export default DockItem;
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
export function buildGenerationPrompt(componentTree, tokens, apiConfig = {}) {
  const trimmedTree    = trimTree(componentTree);
  const componentNames = [...collectComponentNames(componentTree)];
  const usedTypes      = [...collectTypes(componentTree)];

  const hasAPIs    = apiConfig.hasAPIs;
  const hasMap     = apiConfig.promptSections?.some(s => s.includes('Leaflet'));
  const pkgNames   = Object.keys(apiConfig.packages || {});

  // ── Conditional rules ───────────────────────────────────────────────────

  const rule8 = hasAPIs
    ? `8. **External libraries**: Use ONLY React and these packages (already in package.json): ${pkgNames.join(', ') || 'none — only browser fetch()'}. For API calls use the browser's built-in \`fetch()\`. No additional npm packages.`
    : `8. **No external libraries**: Only React. No framer-motion, no MUI, no map libraries.`;

  const rule9 = hasMap
    ? `9. **Map rendering**: Use react-leaflet with CartoDB dark tiles (see API section). The map must be interactive (pan, zoom). Float BMW-styled controls on top using position absolute within the map's relative container. DO NOT use Leaflet's default marker icons — use L.divIcon.`
    : `9. **Map placeholder**: Render map areas as dark containers (#0A0A0A) with CSS gradients to suggest roads. Do NOT embed actual maps.`;

  // ── API & service layer section ─────────────────────────────────────────

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

  // ── Build prompt ────────────────────────────────────────────────────────

  return `
You are a senior React engineer building a BMW iDrive center console navigation interface. Generate a complete, working React application from a Figma wireframe that displays as a realistic, ${hasAPIs ? 'fully functional' : 'static'} BMW navigation screen in the browser.

## BMW AUTOMOTIVE UI/UX DESIGN CONSTRAINTS — VERBINDLICH

Du bist ein Automotive UI/UX Designer mit Expertise im Premium-Fahrzeugsegment.
Designprinzip: Ein gutes Interface ist nicht nur attraktiv — es ist intuitiv.
Funktion und Sicherheit haben immer Vorrang vor Ästhetik.
Design ist die digitale Visitenkarte der Marke BMW: präzise, technisch überlegen, kontrolliert.

### I. SICHERHEIT & FAHRERKONTEXT — ABSOLUTE PRIORITÄT

Jede Designentscheidung muss unter der Frage bewertet werden:
"Kann ein Fahrer bei 130 km/h auf der Autobahn diese Information in unter 1,5 Sekunden erfassen?"

VERBOTEN:
- Mehr als 7 primäre Aktionen auf einem Screen gleichzeitig
- Informationstiefe tiefer als 3 Menüebenen während der Fahrt
- Modale Overlays, die mehr als 40% des Screens bedecken
- Animationen länger als 300ms für Systemfeedback
- Parallax-Scrolleffekte oder gleichzeitige Bewegungen auf mehr als 2 Elementen
- Autoplay-Videos oder bewegte Hintergründe

PFLICHT:
- Touch-Targets mindestens 44×44px (Handschuhe, Fahrsituationen)
- Jede primäre Aktion muss mit einem Blick erfassbar sein (Glanceability)
- Kritische Warnings immer im direkten Sichtfeld, nie peripher versteckt

### II. BRAND-IDENTITÄT — BMW DNA

Designe nicht "einen Touchscreen" — designe BMWs Touchscreen.
Jedes Element muss fragen: "Fühlt sich das BMW an?"

BMW DESIGNSPRACHE:
- Präzision: Saubere Linien, keine überflüssigen Elemente
- Technische Überlegenheit: Professionell, nicht verspielt
- Emotionale Qualität: Premium-Feeling durch Details, nicht durch Dekoration
- Kontrolliertheit: Der Fahrer ist immer Herr der Situation

VERBOTEN:
- Consumer-App-Feeling (Bottom-Navigation-Bars wie Instagram/TikTok)
- Tesla-Look: horizontale Mega-Screens ohne Struktur oder Hierarchie
- Warme Goldtöne als Akzent (→ Rolls-Royce/Mercedes-Territorium)
- Sportliches Rot als primäre Akzentfarbe (→ Ferrari/Audi Sport)
- Verspielter Stil, Gamification-Elemente, Blob-Schatten, Illustrationen

### III. TYPOGRAFIE — VERBOTEN

- Inter, Roboto, Arial als primäre Schrift, Helvetica als primäre Schrift, System-UI, Comic Sans
- Mehr als 3 Schriftschnitte gleichzeitig auf einem Screen
- ALL CAPS Texte länger als 4 Wörter
- Fließtext unter 14px (Vibration, Fahrsituation)
- Letter-Spacing unter -0.02em bei Überschriften

### IV. FARBE & KONTRAST — VERBOTEN

- Reines Weiß (#FFFFFF) als Hintergrund — zu hart, kein Tiefengefühl
- Reines Schwarz (#000000) als Hintergrund — stattdessen kühle/warme Dunkelwerte wie #0D0D0D
- Lila, pink oder grüne Gradienten — Consumer-App-Look
- Bunte Drop-Shadows (Color Shadows wie im iOS-Trend)
- Mehr als 2 Akzentfarben gleichzeitig auf einem Screen
- Pastell als primäre Systemfarben — wirkt infantil
- Dark Mode ohne Oberflächendifferenzierung: alle Ebenen müssen unterscheidbar bleiben (#0D0D0D, #1A1A1A, #262626)
- Niedriger Kontrast unter WCAG AA — besonders sicherheitskritisch

### V. LAYOUT & KOMPOSITION — VERBOTEN

- Zentriertes 3-Karten-Grid-Layout — generischstes UI-Pattern überhaupt
- Gleichmäßig verteilte Elemente ohne visuelle Hierarchie
- Hamburger-Menü als primäre Navigation (ungeeignet für Fahrsituation)
- Horizontales Scrollen außer in expliziten, gekennzeichneten Carousels
- Informationsarchitektur tiefer als 3 Ebenen
- Asymmetrische Layouts, die den Fahrerblick von der Straße wegziehen

### VI. ANIMATION & MOTION — VERBOTEN

- Animationen über 300ms für Systemfeedback (zu langsam beim Fahren)
- "Bouncy" Easing / Spring Physics für primäre UI-Elemente — wirkt verspielt
- Parallax-Scroll-Effekte (Schwindel, Ablenkung)
- Autoplay-Videos oder GIFs als Hintergründe
- Simultane Animationen auf mehr als 2 Elementen
- Ladeanimationen ohne Progress-Indikator

PFLICHT:
- Easing: ease-out für Einblenden, ease-in-out für Übergänge
- Systemfeedback: maximal 150–200ms
- State-Transitions müssen den Kontext bewahren (Nutzer verliert nie Orientierung)

### VII. KOMPONENTEN & PATTERNS — VERBOTEN

- Standard shadcn/ui, Material Design oder Bootstrap ohne vollständiges Restyling
- Glassmorphism als primäres Designsystem (backdrop-filter: blur)
- Neumorphism — schlechter Kontrast, schlecht lesbar im Fahrzeug
- Standard-iOS/Android-Komponenten — BMW hat eigene HMI-Sprache
- Emoji als UI-Icons
- Gemischte Icon-Stile (Outline + Filled auf demselben Screen)
- Icons unter 24px in touch-interaktiven Bereichen

PFLICHT:
- Konsistentes Icon-Gewicht und -Geometrie
- Alle interaktiven Elemente visuell eindeutig als solche erkennbar
- Definierte States: default, hover, active, disabled, error, focus

### VIII. BMW-SPEZIFISCHE REGELN

- border-radius für primäre Container: maximal 12px (nicht rund/verspielt)
- Akzentfarben: kühles Blau (BMW i-Linie #1C69D4), gedämpftes Teal, technisches Weiß
- Geometrische, klare Typografie — keine generischen Web-Fonts
- Mindestens 3 unterscheidbare Oberflächenebenen (background, surface, elevated)

BMW UI muss sich anfühlen wie: präzise, kühl, technisch überlegen, kontrolliert — Cockpit eines Hochleistungsgeräts, nicht Consumer-App.

### SELF-CHECK VOR DER CODE-GENERIERUNG

Beantworte intern vor jeder Ausgabe:
1. Kann ein Fahrer bei 130 km/h dies in 1,5 Sek. erfassen?
2. Fühlt sich dies BMW an — oder wie eine Consumer-App?
3. Ist die Informationshierarchie sofort klar ohne Suchen?
4. Sind alle Touch-Targets ≥ 44px?
5. Ist der Kontrast WCAG AA-konform?
6. Gibt es mehr als 7 primäre Aktionen? Wenn ja: reduzieren.
7. Würde dieser Screen einen Fahrer ablenken?
Wenn eine Frage mit NEIN beantwortet wird: überarbeiten, nicht ausgeben.

## Context

This is a **car center console display** (BMW iDrive), not a website. The output must look like an embedded automotive infotainment screen.

Screen specification:
- **Resolution**: 1920×720 pixels (widescreen, ~2.67:1 aspect ratio)
- **Display**: Dark theme, optimized for automotive use
- **Interaction**: Touch-only (generous touch targets of 48–60px)

Component types in this wireframe: ${usedTypes.join(', ')}
${hasAPIs ? `Dynamic services: ${apiConfig.detectedServices.join(', ')}` : ''}

## BMW iDrive Design System

### Colors
- **Background**: #0D0D0D (near-black, OLED-friendly)
- **Elevated surfaces**: #1A1A1A (cards, overlays, panels)
- **Overlay surfaces**: #262626 (dialogs, search bars)
- **Interactive surfaces**: #2A2A2A (hover: #333333, active: #3D3D3D)
- **BMW Blue**: #1C69D4 (active/selected), #0653B6 (pressed), #3D8BF2 (accent)
- **Text**: #FFFFFF (primary), rgba(255,255,255,0.7) (secondary), rgba(255,255,255,0.5) (muted), rgba(255,255,255,0.3) (disabled)
- **Borders**: rgba(255,255,255,0.1) (subtle), rgba(255,255,255,0.15) (visible)
- **Dividers**: rgba(255,255,255,0.06)
- **Route**: #4A90D9 (active route), #666666 (inactive)
- **Traffic**: #4CAF50 (free), #FFC107 (moderate), #F44336 (heavy), #B71C1C (standstill)
- **Map**: #0A0A0A (bg), #333333 (roads), #1A3A5C (water), #1A331A (parks)

### Typography
- **Font**: "bmwTypeNextWeb", "Arial", "Helvetica", sans-serif
- **Weight 300** (light) — BMW signature, even headings
- **400** (regular): inputs, captions  |  **500** (medium): buttons, labels, dock  |  **700** (bold): speed limit only
- **Display**: 3rem  |  **H1**: 1.75rem  |  **H2**: 1.375rem  |  **Body**: 1rem  |  **Caption**: 0.75rem  |  **Label**: 0.6875rem / 500 / uppercase / 0.05em spacing

### Spacing
- **Touch targets**: 3.75rem preferred, 3rem minimum
- **Border-radius**: 0.375rem (sm), 0.75rem (md), 1rem (lg), 1.5rem (xl), 50% (circle)
- **Shadows**: 0.3–0.6 opacity (deeper than web, for dark-on-dark contrast)
- **Status bar**: 2.5rem  |  **Dock**: 4.5rem  |  **Side panel**: 22rem

### Icons (geometric Unicode only — KEINE EMOJI)
Navigation: ▲ ● ◀ ▶ | Media: ▶ ‖ ▸▸ ◂◂ | Climate: ✳ △ ▽ | Vehicle: ↯ ■ | General: ✕ ☰ ← ★ | Dock: ◎ ♪ ☏ ▣ ⚙
CRITICAL: NEVER use emoji characters (📍🎵📞🚗🔊⛽❄♨⚡ etc.) as UI icons. Emoji break BMW's precise, technical aesthetic. Use ONLY geometric Unicode symbols (▲▶●◎★✕☰♪☏), CSS-drawn shapes (circles, bars, lines via div+border), or inline SVG paths. If no suitable Unicode symbol exists, draw the icon with CSS (background + border + border-radius) or describe it as an SVG path.
${apiSection}${serviceLayerSection}
## Component Tree (from Figma, with pre-computed styles)

\`\`\`json
${JSON.stringify(trimmedTree, null, 2)}
\`\`\`

## Design Tokens

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

## Your Task

Generate a complete React application. Files to create:

${componentNames.map(n => `- ${n}.jsx`).join('\n')}
- App.jsx (root — assembles the full screen layout${hasAPIs ? ', wraps in context providers' : ''})
- main.jsx (entry point)

## Rules

1. **File format**: Each file starts with \`// FILE: ComponentName.jsx\` then \`// Figma: [type] "[name]"\`
2. **Inline styles only**: Use pre-computed \`style\` objects as base. No CSS files, no className, no CSS-in-JS.
3. **Flexbox layout**: Screen is 100vw × 100vh. Use flexbox. Only use \`position: absolute\` for elements that truly float (quick actions, overlays on map).
4. **Props**: Each component accepts \`children\` and \`style\` (spread at end for overrides).
5. **ES Modules**: \`import/export\`, no CommonJS.
6. **Functional components**: Use hooks (useState, useEffect, useContext) for state and side effects.
7. **Text content**: Use \`content\` from the tree, or realistic German BMW text ("Zum Ziel navigieren", "Route berechnen", Munich street names).
${rule8}
${rule9}
10. **Touch targets**: All interactive elements ≥ 3rem (48px).
11. **Fill screen**: 100vw × 100vh, use flex-grow/shrink.
12. **Realistic data**: German street names, real distances, plausible ETAs and temperatures.
13. **Dark theme**: Every surface must be dark. Zero white/light backgrounds.
14. **BMW Blue**: #1C69D4 for active dock item, active route, primary buttons.
15. **Nesting**: Components with children in the tree render \`{children}\`.
15b. **NO EMOJI**: Never use emoji characters (📍🎵📞🚗🔊⛽❄♨⚡🧭⚙🅿🍽☕🍔🏦💊 etc.) anywhere in the UI. Use ONLY geometric Unicode symbols (▲▶●◎★✕☰♪☏△▽✳), CSS-drawn shapes (div+border+border-radius), or inline SVG. Emoji destroy BMW's precise, technical aesthetic.

## CRITICAL — File completeness rules (violations will break the app)

16. **Every \`// FILE:\` block MUST be a complete, working React component.** It MUST contain an \`import React\` statement, a component function, JSX return, and \`export default ComponentName\`. NEVER output a file that contains only a comment like "already defined above" or "see parent component" — that will crash the app.
17. **Every \`import Foo from './Foo.jsx'\` MUST have a matching \`// FILE: Foo.jsx\` block in your output.** If you import it, you must generate it. No exceptions.
18. **No duplicate merging**: If two nodes in the tree have similar names, generate BOTH as separate complete files. Do NOT skip one and write "duplicate guard" or "merged into parent". Each file stands alone.
19. **Self-check before finishing**: Mentally verify that every import statement across all files resolves to a \`// FILE:\` block you actually generated. If any import is missing, add the file.

## Output Format

Fenced code blocks, each starting with \`// FILE:\`:

\`\`\`jsx
// FILE: ComponentName.jsx
import React from 'react';
// ...
\`\`\`

## Example

${EXAMPLE_COMPONENT}

Now generate all components. Leaf components first, then containers, then App.jsx last. Make it look and ${hasAPIs ? 'work' : 'feel'} like a real BMW iDrive screen.
`.trim();
}
