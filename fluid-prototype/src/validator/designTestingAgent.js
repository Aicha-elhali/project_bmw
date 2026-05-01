import Anthropic from '@anthropic-ai/sdk';
import { getRulesForDesignQA } from '../knowledge/bmwDesignSystem.js';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a senior BMW HMI design QA engineer and pixel-perfect UI auditor.
You review generated React UI code against the BMW HMI Design System (Operating System X / Panoramic Vision style).
Target: 1920x720 dark-theme car display with blue-tinted surfaces, chamfered bottom-right corner.

The BMW HMI Design System reference is provided in the user message — use it as ground truth for all checks.

## Categories to check

### 1. Chrome Structure (critical if wrong)
- App.jsx MUST import HMIDisplay from './hmi/HMIChrome.jsx' and wrap all content
- App.jsx MUST import and render HMIHeader, HMIFooter
- App.jsx SHOULD import LeftSideSlot, RightSideSlot
- Generated components must NOT create their own: header, footer, status bar, dock, navigation bar, climate controls, quick-action bar
- Content must be inside a container with \`position: absolute; inset: 0\` — NEVER with top/left offsets
- Rule: "own-chrome" — any hand-built header/footer/dock/statusbar/climate bar

### 2. Offscreen Detection (critical)
- Check ALL \`position: absolute\` / \`position: fixed\` elements are within 1920x720
- Popups/modals should not exceed ~40% of screen area
- Watch for negative margins or transforms pushing content offscreen
- Rule: "offscreen-element", "overflow-leak", "oversized-modal"

### 2b. Content Container Violations (critical)
The content container in App.jsx MUST use \`position: absolute; inset: 0; pointerEvents: "none"\`.
It MUST NOT have top/left offsets (e.g., top: 70, left: 240) — this is WRONG.
- Rule: "safe-zone-violation"

### 2c. Inter-Component Overlap Detection (warning)
Different COMPONENTS must not unintentionally overlap on screen.
Do NOT flag elements WITHIN the same component (internal layout is the component's concern).
- Rule: "component-overlap"

### 2d. Map Interaction Blocking (critical)
For interactive map screens: no wrapper div with \`pointerEvents: "auto"\` covering the full content area.
Each individual content panel sets \`pointerEvents: "auto"\` on itself only.
- Rule: "map-interaction-blocked"

### 3. Icon Validation (warning, with fix suggestion)
Every icon MUST use BMWIcon from hmi/BMWIcons.jsx. Detect custom SVGs, Unicode symbols, emoji, other icon libraries.
For each wrong icon, suggest the correct BMWIcon name (see Icon Mapping in the design system reference).
- Rule: "wrong-icon", "emoji-icon", "custom-svg-icon"

### 4. Logo Validation (critical)
Check all BMW logos against the Logo rules in the design system reference. Any hand-drawn logo (SVG, CSS, canvas, styled text) is WRONG.
The HMIHeader does NOT contain a BMW logo — that is correct.
- Rule: "fake-bmw-logo", "logo-wrong-size", "logo-on-light-bg"

### 5. Surface Colors
Check for neutral blacks vs BMW blue-tinted surfaces (see Surface Color Correction in the design system reference).
Cards MUST use gradient, not flat single color.
- Rule: "neutral-black-bg", "flat-card", "wrong-map-bg"

### 6. Typography
Font must match the Typography section in the design system reference. ALL CAPS labels need proper letter-spacing.
- Rule: "wrong-font", "allcaps-no-tracking", "wrong-weight"

### 7. Touch Targets & Layout
Interactive elements >= 64px (minimum 48px secondary). No more than 7 primary actions visible.
- Rule: "small-target", "max-actions"

### 8. Brand Identity
No emoji, no consumer-app patterns, no warm accents, no glassmorphism on solid surfaces.
- Rule: "emoji-icon", "consumer-pattern", "warm-accent", "glassmorphism-misuse"

### 9. Motion
Easing: cubic-bezier(0.4, 0, 0.2, 1). Duration: 150-300ms for feedback. Never > 400ms.
- Rule: "wrong-easing", "slow-animation"

### 10. Position Fidelity (critical)
When a "Wireframe Position Reference" table is provided, compare intended positions against actual code.
Tolerance: ±30px for position, ±15% for dimensions. Focus on horizontal position (left).
- Rule: "position-fidelity"

## Output format

Respond with ONLY this JSON, no other text:
{
  "approved": boolean,
  "summary": "one-line assessment",
  "issues": [
    {
      "file": "src/components/Foo.jsx",
      "line": 42,
      "severity": "critical" | "warning",
      "rule": "own-chrome | missing-hmi-display | offscreen-element | overflow-leak | oversized-modal | safe-zone-violation | component-overlap | map-interaction-blocked | position-fidelity | wrong-icon | emoji-icon | custom-svg-icon | fake-bmw-logo | logo-wrong-size | logo-on-light-bg | neutral-black-bg | flat-card | wrong-map-bg | wrong-font | allcaps-no-tracking | wrong-weight | small-target | max-actions | consumer-pattern | warm-accent | glassmorphism-misuse | wrong-easing | slow-animation | other",
      "description": "what is wrong",
      "suggestion": "how to fix it",
      "fix": "optional — replacement JSX code for icon/logo issues"
    }
  ]
}

Set "approved" to false if there are ANY critical issues.
Warnings alone do NOT block approval but MUST be reported.
For icon issues, ALWAYS include the "fix" field with exact replacement code.

## USER OVERRIDE POLICY

If "User Requirements" are included, those have ABSOLUTE PRIORITY over the BMW Design Guide.
Do NOT flag issues that are a direct result of user requirements.
Only flag issues that CONTRADICT what the user requested, or structural issues the user did NOT override.`;

function extractPositionReference(componentTrees) {
  if (!componentTrees || componentTrees.length === 0) return '';
  const rows = [];
  function walk(node, depth) {
    if (node.safeZoneHint && depth > 0 && depth <= 3 && node.type !== 'container') {
      rows.push({
        label: node.label || node.type,
        type: node.type,
        left: node.safeZoneHint.left,
        top: node.safeZoneHint.top,
        width: node.safeZoneHint.width,
        height: node.safeZoneHint.height,
        rel: node.relativeLayout,
      });
    }
    for (const child of node.children ?? []) walk(child, depth + 1);
  }
  for (const tree of componentTrees) walk(tree, 0);
  if (rows.length === 0) return '';

  let table = '## Wireframe Position Reference (from Figma)\n\n';
  table += 'These are the INTENDED positions. Generated code MUST place components at approximately these positions.\n\n';
  table += '| Component | Type | Left (px) | Top (px) | Width (px) | Height (px) | X% | Y% |\n';
  table += '|-----------|------|-----------|---------|------------|-------------|----|----|\n';
  for (const r of rows) {
    const xp = r.rel ? `${r.rel.xPercent}%` : '-';
    const yp = r.rel ? `${r.rel.yPercent}%` : '-';
    table += `| ${r.label} | ${r.type} | ${r.left} | ${r.top} | ${r.width} | ${r.height} | ${xp} | ${yp} |\n`;
  }
  table += '\nTolerance: ±30px for position, ±15% for dimensions.\n\n';
  return table;
}

function buildUserMessage(files, tokens, userPrompt, componentTrees, plan) {
  let msg = 'Review these BMW HMI React UI files for design system compliance.\n\n';

  if (plan) {
    msg += `## QA Plan (from Planning Agent)\n\n${plan}\n\n`;
  }

  msg += `## BMW HMI Design System Reference\n\n${getRulesForDesignQA()}\n\n`;

  msg += '## File contents\n\n';
  for (const [path, code] of files) {
    if (path.includes('services/') || path.includes('hooks/') || path.includes('context/')) continue;
    if (path.includes('src/hmi/')) continue;
    msg += `### ${path}\n\`\`\`jsx\n${code}\n\`\`\`\n\n`;
  }

  if (tokens) {
    msg += `## Design tokens\n\`\`\`json\n${JSON.stringify(tokens, null, 2)}\n\`\`\`\n\n`;
  }

  if (userPrompt) {
    msg += `## User Requirements (DO NOT flag deviations caused by these)\n\n> ${userPrompt}\n\n`;
  }

  const posRef = extractPositionReference(componentTrees);
  if (posRef) msg += posRef;

  msg += `Focus on:
1. Does App.jsx use HMIDisplay + HMIHeader + HMIFooter from hmi/?
2. Are there hand-built headers, footers, status bars, docks?
3. Are there offscreen elements?
4. Does the content container use \`inset: 0\` WITHOUT top/left offsets?
5. Do top-level COMPONENTS in App.jsx overlap?
6. Are there custom SVG icons or emoji that should be BMWIcon?
7. Are there fake BMW logos?
8. Are background colors neutral-black instead of blue-tinted?
9. Are cards flat instead of gradient?
10. If position reference provided: are components at intended positions?`;

  return msg;
}

function parseJsonResponse(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

export async function runDesignTestingAgent(files, { apiKey, tokens, userPrompt, componentTrees, figmaScreenshot, plan }) {
  const uiFiles = new Map(
    [...files.entries()].filter(([p]) =>
      !p.includes('services/') && !p.includes('hooks/') && !p.includes('context/')
    )
  );

  if (uiFiles.size === 0) {
    return { approved: true, summary: 'No UI files to review', issues: [] };
  }

  const client = new Anthropic({ apiKey });

  const userContent = [];

  if (figmaScreenshot && typeof figmaScreenshot === 'object' && figmaScreenshot.data) {
    userContent.push({
      type: 'text',
      text: 'Here is a screenshot of the original Figma wireframe. Compare the generated code layout against this reference:',
    });
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: figmaScreenshot.mimeType || 'image/png', data: figmaScreenshot.data },
    });
  }

  userContent.push({
    type: 'text',
    text: buildUserMessage(uiFiles, tokens, userPrompt, componentTrees, plan || ''),
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  try {
    const verdict = parseJsonResponse(text);
    return {
      approved: verdict.approved === true,
      summary: verdict.summary || '',
      issues: Array.isArray(verdict.issues) ? verdict.issues : [],
    };
  } catch (e) {
    return {
      approved: false,
      summary: 'Design testing agent returned unparseable response',
      issues: [{
        file: '',
        severity: 'critical',
        rule: 'other',
        description: 'Response was not valid JSON: ' + text.slice(0, 200),
        suggestion: 'Re-run validation',
      }],
    };
  }
}
