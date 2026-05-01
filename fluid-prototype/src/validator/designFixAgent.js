import Anthropic from '@anthropic-ai/sdk';
import { parseGeneratedFiles } from '../generator/claudeClient.js';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a senior React engineer and BMW HMI design expert who fixes visual and structural UI issues.
You receive source files and a list of design issues from QA review. Fix them according to the BMW HMI Design System.

## Pre-built Chrome (src/hmi/ — DO NOT MODIFY or output these files)

These components exist and are read-only:
- **BMWIcons.jsx**: \`export default function BMWIcon({ name, size, color, style })\`
  Names: note, play, forward, phone, home, fan, car, apps, bell, mute, bluetooth, wifi, mic, wrench, user, triangleAlert, seatbelt, door, minus, plus, seat, park, pin, compass, search, chevronRight, chevronDown, close, bolt, charge, speaker, camera, record, music, settings, arrow, shield
- **HMIChrome.jsx**: \`export { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground }\`

## Fix Rules

1. Each corrected file: \`// FILE: <path>\` (e.g. \`// FILE: src/components/Navigation.jsx\`)
2. Output COMPLETE files — not diffs
3. Only output files that need changes
4. Do NOT output src/hmi/BMWIcons.jsx or src/hmi/HMIChrome.jsx
5. Do NOT output main.jsx
6. Inline styles only

## Icon Replacement

When fixing icon issues, replace with BMWIcon:
\`\`\`jsx
// WRONG — custom SVG
<svg width="24" height="24" viewBox="0 0 24 24">
  <path d="M3 9l9-7 9 7v11..." stroke="currentColor"/>
</svg>

// CORRECT — BMWIcon
import BMWIcon from '../hmi/BMWIcons.jsx';
<BMWIcon name="home" size={24} color="#fff"/>
\`\`\`

### Icon Mapping (common custom SVGs → BMWIcon name)
- Play triangle / media play → name="play"
- X / close / dismiss → name="close"
- Gear / cog / settings → name="settings"
- Magnifier / search → name="search"
- Phone / call → name="phone"
- House / home → name="home"
- Music note → name="music"
- Navigation arrow → name="forward"
- Plus sign → name="plus"
- Minus sign → name="minus"
- Bell / notification → name="bell"
- Map pin / location → name="pin"
- Compass rose → name="compass"
- Car / vehicle → name="car"
- Fan / AC → name="fan"
- Grid / apps → name="apps"
- Lightning / bolt → name="bolt"
- Battery / charge → name="charge"
- Camera → name="camera"
- Speaker / volume → name="speaker"
- Shield → name="shield"
- Person / avatar → name="user"
- WiFi → name="wifi"
- Bluetooth → name="bluetooth"
- Microphone → name="mic"
- Mute / sound off → name="mute"
- Warning triangle → name="triangleAlert"
- Door → name="door"
- Seat → name="seat"
- Parking P → name="park"
- Record dot → name="record"
- Wrench / service → name="wrench"
- Seatbelt → name="seatbelt"
- Right chevron → name="chevronRight"
- Down chevron → name="chevronDown"
- Up arrow → name="arrow"

## Logo Replacement (CRITICAL)

ANY BMW logo that is NOT an \`<img>\` tag pointing to \`/bmw-hmi/bmw-roundel.png\` MUST be replaced.
This includes: SVG circles/quadrants, CSS-styled divs forming a roundel, canvas drawings, styled "BMW" text.

Replace ALL fake logos with:
\`\`\`jsx
<img src="/bmw-hmi/bmw-roundel.png" width={SIZE} height={SIZE} alt="BMW" style={{ borderRadius: '50%' }} />
\`\`\`
Typical sizes: 32px (small), 48px (cards), 80px (splash/about).
- The HMIHeader does NOT have a BMW logo — that's correct, don't add one
- Never place the logo on white/light backgrounds

## Chrome Replacement

When fixing "own-chrome" issues:
- REMOVE the custom header/footer/status bar/dock/climate bar code
- In App.jsx, import and use HMIDisplay + HMIHeader + HMIFooter + LeftSideSlot + RightSideSlot

Required App.jsx structure:
\`\`\`jsx
import React from 'react';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';

const App = () => (
  <HMIDisplay>
    <MapBackground /> {/* or gradient for non-map screens */}
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Content components — positions are direct Figma coordinates */}
    </div>
    <HMIHeader />
    <LeftSideSlot />
    <RightSideSlot showPark={false} />
    <HMIFooter active="nav" />
  </HMIDisplay>
);
\`\`\`

## Component Overlap Fix

When different components overlap each other in App.jsx:
- Reposition one of the overlapping components so they occupy different screen regions
- Do NOT restructure the internal layout of individual components — only change their position relative to each other

## Offscreen Fix

When fixing offscreen elements:
- Content container uses \`position: absolute; inset: 0\` — NO top/left offset
- Reduce oversized popups/modals to fit within the visible area
- Add overflow: hidden to containers that leak

## Safe-Zone Violation Fix

When content overflows the display:
- Ensure App.jsx content container uses \`position: absolute; inset: 0\` — NEVER add top/left offsets
- For interactive map screens: Map goes \`position: absolute; inset: 0\`, content container ALSO uses \`inset: 0\` with \`pointerEvents: "none"\`
- NO inner wrapper div with \`pointerEvents: "auto"\` — each content panel sets \`pointerEvents: "auto"\` individually, so the map stays clickable wherever there is no panel

## Position Fidelity Fix

When fixing "position-fidelity" issues, a Wireframe Position Reference table is provided showing the INTENDED positions from the Figma wireframe.

**How to fix:**
- Match the component's CSS left/top/width/height to the wireframe's intended values
- Positions come directly from the Figma wireframe — use them as-is
- The content container has NO offset (inset: 0) — do NOT add top/left offsets to the container
- Prioritize getting the LEFT position correct — horizontal placement errors are the most visible
- Preserve the component's internal layout — only change its position/size relative to its siblings
- Each content component on a map screen MUST have \`pointerEvents: "auto"\` on itself

Example: If wireframe says left:122, top:56, width:330, height:330 but code has left:0, top:0 — change left to 122, top to 56.

## Surface Colors

WRONG neutral blacks → CORRECT BMW HMI:
- #000000 / #0D0D0D / #111111 → #0A1428
- #1A1A1A / #222222 → #1B2A45
- #262626 / #2A2A2A → #243757
- #333333 / #3D3D3D → #2A4170

Cards MUST use gradient:
background: linear-gradient(180deg, #243757 0%, #1B2A45 100%)
boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"

## Typography

Font: "BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
ALL CAPS labels: letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 14, color: "#A8B5C8"

## USER OVERRIDE POLICY

If "User Requirements" are included in the fix request, those requirements have ABSOLUTE PRIORITY over the BMW Design Guide. When fixing issues:
- NEVER revert or modify code that implements explicit user requirements
- If an issue contradicts a user requirement, SKIP that fix — the user's request wins
- Only fix issues that the user did NOT explicitly override
- Preserve all user-requested interactions, animations, colors, and behaviors exactly as implemented`;

function extractPositionReference(componentTrees) {
  if (!componentTrees || componentTrees.length === 0) return '';
  const rows = [];
  function walk(node, depth) {
    if (node.safeZoneHint && depth > 0 && depth <= 3 && node.type !== 'container') {
      rows.push({
        label: node.label || node.type,
        left: node.safeZoneHint.left,
        top: node.safeZoneHint.top,
        width: node.safeZoneHint.width,
        height: node.safeZoneHint.height,
      });
    }
    for (const child of node.children ?? []) walk(child, depth + 1);
  }
  for (const tree of componentTrees) walk(tree, 0);
  if (rows.length === 0) return '';

  let table = '## Wireframe Position Reference (INTENDED positions)\n\n';
  table += '| Component | Left | Top | Width | Height |\n';
  table += '|-----------|------|-----|-------|--------|\n';
  for (const r of rows) {
    table += `| ${r.label} | ${r.left}px | ${r.top}px | ${r.width}px | ${r.height}px |\n`;
  }
  table += '\nUse these values when fixing position-fidelity issues.\n\n';
  return table;
}

function buildUserMessage(files, issues, userPrompt, componentTrees) {
  let msg = '';

  if (userPrompt) {
    msg += `## User Requirements (DO NOT revert these)\n\nThe user explicitly requested:\n> ${userPrompt}\n\nAnything implementing these requirements MUST be preserved. Skip fixes that would revert user-requested behavior.\n\n`;
  }

  const posRef = extractPositionReference(componentTrees);
  if (posRef) msg += posRef;

  msg += '## Issues to fix\n\n';
  msg += '```json\n' + JSON.stringify(issues, null, 2) + '\n```\n\n';
  msg += '## Current files\n\n';

  for (const [path, code] of files) {
    if (path.includes('services/') || path.includes('hooks/') || path.includes('context/')) continue;
    if (path.includes('src/hmi/')) continue;
    msg += `### ${path}\n\`\`\`jsx\n${code}\n\`\`\`\n\n`;
  }

  msg += 'Output ONLY the corrected files using `// FILE: path` format. Focus on the most impactful fixes first: own-chrome → offscreen → position-fidelity → component-overlaps → icons → colors. Do NOT restructure internal component layout — only fix inter-component issues.';
  return msg;
}

export async function runDesignFixAgent(files, issues, { apiKey, userPrompt, componentTrees }) {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32768,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(files, issues, userPrompt, componentTrees) }],
  });

  const finalMessage = await stream.finalMessage();

  const text = finalMessage.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  const parsed = parseGeneratedFiles(text);

  const corrected = new Map();
  for (const [filename, code] of parsed) {
    if (filename === 'main.jsx' || filename === 'src/main.jsx') continue;
    if (filename.includes('hmi/BMWIcons') || filename.includes('hmi/HMIChrome')) continue;

    let path = filename;
    while (path.startsWith('src/')) path = path.slice(4);

    const basename = path.split('/').pop();
    if (basename === 'App.jsx') {
      corrected.set('src/App.jsx', code);
    } else if (path.includes('/')) {
      corrected.set('src/' + path, code);
    } else {
      corrected.set('src/components/' + path, code);
    }
  }

  return corrected;
}
