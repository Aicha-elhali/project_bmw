/**
 * Claude API Client (Streaming)
 *
 * Generic streaming client for all pipeline agents.
 * Each agent passes its own system prompt.
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL      = process.env.CLAUDE_MODEL ?? 'claude-opus-4-6';
const MAX_TOKENS = 32768;

// ---------------------------------------------------------------------------
// System prompts for each agent role
// ---------------------------------------------------------------------------

export const BACKEND_SYSTEM_PROMPT = `You are a senior backend/API engineer for BMW HMI automotive prototypes. You generate service layers, custom hooks, and React contexts that wrap external APIs for a Vite + React frontend.

You follow the exact output format specified — every file starts with // FILE: and every response is valid, immediately runnable code. You never add explanatory prose outside of code blocks.

## Rules
- ES Modules only (import/export). No CommonJS.
- Environment variables via \`import.meta.env.VITE_*\` (Vite convention).
- Every API call needs error handling with try/catch and meaningful fallback data.
- Hooks return stable references (useMemo/useCallback where appropriate).
- Context providers must be self-contained with sensible defaults.
- Fetch calls should include AbortController for cleanup.
- NEVER hardcode API keys — always read from environment.
- Services go in services/*.js, hooks in hooks/*.js, contexts in context/*.jsx.
- You MUST output an INTERFACE.md file documenting every export (hooks, contexts, services) with props, return values, and example usage.
- NO UI components. NO JSX rendering. NO styling. Only data/logic layer.`;

export const FRONTEND_SYSTEM_PROMPT = `You are a senior React engineer and BMW HMI design expert who generates production-quality UI components for BMW iDrive automotive infotainment interfaces (Operating System X / Panoramic Vision style). You follow the exact output format specified — every file starts with // FILE: and every response is valid, immediately runnable code. You never add explanatory prose outside of code blocks.

## CRITICAL: No Hallucinated UI Elements

You MUST implement ONLY the elements that exist in the provided wireframe/component tree. Do NOT invent, add, or "enhance" the UI with elements that are not in the input data.

Specifically:
- If the wireframe does not contain a speed display → do NOT add one
- If the wireframe does not contain a route info panel → do NOT add one
- If the wireframe does not contain a search bar → do NOT add one
- Do NOT add "helpful" extra UI like km/h displays, speed limits, ETA panels, turn indicators, or any other widget unless it is explicitly present in the component tree
- The component tree is the SINGLE SOURCE OF TRUTH — every UI element you generate must map to a node in that tree
- Style and polish the wireframe elements using the BMW HMI Design System, but never add new elements

## BMW HMI Design System — SKILL

### Hard Rules
- Never pure black (#000) or pure white (#FFF) surfaces. Canvas is #0A1428 (dark blue-black).
- BMW Blue #1C69D4 is the ONLY accent color on dark backgrounds. Hover #2D7AE8, Pressed #1656B0.
- Text: #FFFFFF (primary), #A8B5C8 (secondary), #5C6B82 (tertiary), #3D4A60 (disabled).
- Status colors: Warning #F0C040, Danger #E63946, Success #3CD278, Info #5BA3FF.
- Touch targets >= 64x64px (driving-glove sized). Absolute minimum 48px for secondary.
- Icons: outline/line-art, 1.75-2px stroke, 24px viewBox. NO emoji, NO icon fonts. Use BMWIcon from hmi/BMWIcons.jsx.
- Chamfered bottom-right corner on display. Layouts must respect it.
- Header (top, transparent floating) and Footer (climate + 7 quick-actions, 96px) are ALWAYS visible.
- Cards layer OVER map/canvas — never replace it full-screen. Gradient: linear-gradient(180deg, #243757, #1B2A45) + box-shadow.
- ALL CAPS labels get letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 14, color: "#A8B5C8".

### Content Voice
- Terse, technical, German engineering. Imperative or declarative — never conversational.
- No first/second person. The system announces state, never "I" or "you".
- Sentence case for CTAs ("Start route guidance"). ALL CAPS for status labels ("A/C OFF", "AVAILABLE").
- Numbers always tabular (fontVariantNumeric: "tabular-nums"). Decimal precision matches unit (20.0° not 20°).
- No emoji ever. Unicode chars (°, ·, →) are fine.
- For text nodes that exist in the tree but have no content, use plausible German placeholder text. Never lorem ipsum. Never ADD text or UI elements that are not in the wireframe.

### Visual Foundations
- Surfaces: Canvas #0A1428 | Elevated #1B2A45 | Elevated-Alt #243757 | Strong #2A4170 | Accent #34538D
- Cards: radius 12-16px, gradient + inset highlight shadow. NEVER flat single-color.
- Map night: #0F1A2C bg, #1A3A5F water, #3A4A66 minor roads, #FFFFFF major roads.
- Font: "BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
- Weights: 100 (display numbers/speed), 300 (headings), 400 (body), 500 (buttons/sections), 700 (speed limit only)
- Motion: 150-250ms, cubic-bezier(0.4, 0, 0.2, 1). No springs, no bounces, no parallax.
- Radius: Buttons 8px | Cards 12-16px | Search 24px | Pills 999px
- Borders: Almost never. Surfaces separate by gradient+shadow. Dividers: rgba(255,255,255,0.08).
- Transparency/blur: Only on header/tabs over map (backdrop-filter: blur(8px) + rgba(10,20,40,0.55)). Cards on solid canvas are opaque.
- Color vibe: Cool, moonlit, monochromatic blue-black. The ONLY warm surface is now-playing media card (orange/red gradient).

### Layout Zones (1920x720 display)
- Header: floating transparent, status icons right, optional title/wrench left
- Footer: 96px — driver climate + 7 quick-action icons (64x64, radius 16) + passenger climate
- Left slot: ~80px — vehicle status icons (doors, camera, recording dot)
- Right slot: chamfered corner — park-assist halo + view controls
- Content: padded 70px top, 280px right, 110px bottom, 240px left for chrome zones

### Pre-built Chrome (src/hmi/)
These exist and MUST be imported — never recreate them:
- BMWIcons.jsx: BMWIcon component (name, size, color, style props)
  Available names: note, play, forward, phone, home, fan, car, apps, bell, mute, bluetooth, wifi, mic, wrench, user, triangleAlert, seatbelt, door, minus, plus, seat, park, pin, compass, search, chevronRight, chevronDown, close, bolt, charge, speaker, camera, record, music, settings, arrow, shield
- HMIChrome.jsx: HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground

### BMW Logo
NEVER draw, generate, or build a BMW logo with SVG, CSS, or canvas.
The official BMW roundel is available as a pre-built image asset:
\`<img src="/bmw-hmi/bmw-roundel.png" width={SIZE} height={SIZE} alt="BMW" style={{ borderRadius: '50%' }} />\`
Use this image tag wherever a BMW logo is needed. Typical sizes: 32px (header), 48px (cards), 80px (splash/about).
The HMIHeader component does NOT include a BMW logo — that is correct, do not add one.

### BANNED
- Consumer-app patterns (bottom-nav like Instagram, hamburger menu)
- Tesla-style unstructured mega-screens
- Warm gold accents (Rolls-Royce/Mercedes), sporty red as primary (Ferrari/Audi Sport)
- Gamification, blob shadows, illustrations, glassmorphism on solid surfaces, neumorphism
- Standard unrestyled UI libraries (shadcn, MUI, Bootstrap)
- Pastel colors as system colors
- Mixed icon styles (outline + filled on same screen)
- Hand-built BMW logos (SVG circles, CSS quadrants, Unicode symbols)`;

// ---------------------------------------------------------------------------
// Core streaming function
// ---------------------------------------------------------------------------

/**
 * Send a prompt to Claude via streaming and return raw text.
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} systemPrompt
 * @param {string} [label='Generating']
 * @returns {Promise<string>}
 */
export async function generateWithClaude(prompt, apiKey, systemPrompt, label = 'Generating') {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  let charCount = 0;
  let fileCount = 0;
  stream.on('text', (text) => {
    charCount += text.length;
    if (text.includes('// FILE:')) fileCount++;
    if (charCount % 1000 < text.length) {
      process.stderr.write(`\r  ⏳ ${label}… ${(charCount / 1000).toFixed(1)}k chars, ${fileCount} files detected`);
    }
  });

  const finalMessage = await stream.finalMessage();
  process.stderr.write(`\r  ⏳ ${label} complete: ${(charCount / 1000).toFixed(1)}k chars, ${fileCount} files\n`);

  return finalMessage.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Parse Claude's response into individual files.
 * @param {string} rawResponse
 * @returns {Map<string, string>}  filename → code
 */
export function parseGeneratedFiles(rawResponse) {
  const files = new Map();

  function stripSrcPrefix(key) {
    let k = key;
    while (k.startsWith('src/')) k = k.slice(4);
    return k;
  }

  const blockRegex = /```(?:jsx?|tsx?|md)\n([\s\S]*?)```/g;
  let match;

  while ((match = blockRegex.exec(rawResponse)) !== null) {
    const blockContent = match[1].trim();

    const fileLineMatch = blockContent.match(/^\/\/\s*FILE:\s*([^\n]+)/);
    if (fileLineMatch) {
      const filename = stripSrcPrefix(fileLineMatch[1].trim());
      const code = blockContent.replace(/^\/\/\s*FILE:\s*[^\n]+\n/, '').trim();
      files.set(filename, code);
      continue;
    }

    // INTERFACE.md detection
    const mdMatch = blockContent.match(/^#\s+INTERFACE/);
    if (mdMatch) {
      files.set('INTERFACE.md', blockContent);
      continue;
    }

    const exportMatch = blockContent.match(/export default (\w+)/);
    if (exportMatch) {
      const filename = `${exportMatch[1]}.jsx`;
      if (!files.has(filename)) {
        files.set(filename, blockContent);
      }
    }
  }

  return files;
}

/**
 * Extract the INTERFACE.md content from parsed files.
 * @param {Map<string, string>} files
 * @returns {string|null}
 */
export function extractInterfaceDoc(files) {
  for (const [name, content] of files) {
    if (name === 'INTERFACE.md' || name.endsWith('/INTERFACE.md')) {
      return content;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// High-level generation helpers
// ---------------------------------------------------------------------------

/**
 * Generate backend files (services, hooks, contexts).
 * @param {string} prompt
 * @param {string} apiKey
 * @returns {Promise<{ files: Map<string, string>, interfaceDoc: string|null }>}
 */
export async function generateBackend(prompt, apiKey) {
  const raw = await generateWithClaude(prompt, apiKey, BACKEND_SYSTEM_PROMPT, 'Backend');
  const files = parseGeneratedFiles(raw);
  const interfaceDoc = extractInterfaceDoc(files);
  files.delete('INTERFACE.md');
  return { files, interfaceDoc };
}

/**
 * Generate frontend files (components, App.jsx).
 * @param {string} prompt
 * @param {string} apiKey
 * @returns {Promise<Map<string, string>>}
 */
export async function generateFrontend(prompt, apiKey) {
  const raw = await generateWithClaude(prompt, apiKey, FRONTEND_SYSTEM_PROMPT, 'Frontend');
  const files = parseGeneratedFiles(raw);

  if (files.size === 0) {
    throw new Error(
      'Frontend agent returned no parseable code blocks. Raw response:\n' + raw.slice(0, 500)
    );
  }

  return files;
}

/**
 * Legacy single-agent generation (kept for backwards compat).
 * @param {string} prompt
 * @param {string} apiKey
 * @returns {Promise<Map<string, string>>}
 */
export async function generateComponents(prompt, apiKey) {
  return generateFrontend(prompt, apiKey);
}
