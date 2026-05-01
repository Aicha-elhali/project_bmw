import Anthropic from '@anthropic-ai/sdk';
import { parseGeneratedFiles } from '../generator/claudeClient.js';
import { getRulesForDesignFix } from '../knowledge/bmwDesignSystem.js';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a senior React engineer and BMW HMI design expert who fixes visual and structural UI issues.
You receive source files and a list of design issues from QA review. Fix them according to the BMW HMI Design System.

The BMW HMI Design System reference is provided in the user message — use it for all color values, icon mappings, and fix patterns.

## Pre-built Chrome (src/hmi/ — DO NOT MODIFY or output these files)

These components exist and are read-only:
- **BMWIcons.jsx**: \`export default function BMWIcon({ name, size, color, style })\`
- **HMIChrome.jsx**: \`export { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground }\`

## Fix Rules

1. Each corrected file: \`// FILE: <path>\`
2. Output COMPLETE files — not diffs
3. Only output files that need changes
4. Do NOT output src/hmi/BMWIcons.jsx or src/hmi/HMIChrome.jsx
5. Do NOT output main.jsx
6. Inline styles only

## Fix Patterns

**Chrome Replacement (own-chrome):**
Remove custom header/footer/status bar/dock. In App.jsx use HMIDisplay + HMIHeader + HMIFooter + LeftSideSlot + RightSideSlot.

**Offscreen Fix:**
Content container: \`position: absolute; inset: 0\` — NO top/left offset. Reduce oversized popups. Add overflow: hidden.

**Safe-Zone Violation Fix:**
Content container MUST use \`position: absolute; inset: 0\` — NEVER add top/left offsets.
For map screens: map and content container both use \`inset: 0\`, content sets \`pointerEvents: "none"\`, each panel sets \`pointerEvents: "auto"\` individually.

**Position Fidelity Fix:**
Match CSS left/top/width/height to the Wireframe Position Reference table values. Prioritize LEFT position.

**Component Overlap Fix:**
Reposition overlapping components to different screen regions. Do NOT restructure internal component layout.

## USER OVERRIDE POLICY

If "User Requirements" are included, those have ABSOLUTE PRIORITY.
NEVER revert code implementing user requirements. Skip fixes that contradict user requests.`;

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

function buildUserMessage(files, issues, userPrompt, componentTrees, plan) {
  let msg = '';

  if (plan) {
    msg += `## Fix Plan (from Planning Agent)\n\n${plan}\n\n`;
  }

  msg += `## BMW HMI Design System Reference\n\n${getRulesForDesignFix()}\n\n`;

  if (userPrompt) {
    msg += `## User Requirements (DO NOT revert these)\n\n> ${userPrompt}\n\nPreserve all user-requested behavior. Skip fixes that would revert user requirements.\n\n`;
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

  msg += 'Output ONLY the corrected files using `// FILE: path` format. Focus on most impactful fixes first: own-chrome → offscreen → position-fidelity → component-overlaps → icons → colors.';
  return msg;
}

export async function runDesignFixAgent(files, issues, { apiKey, userPrompt, componentTrees, plan }) {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32768,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(files, issues, userPrompt, componentTrees, plan || '') }],
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
