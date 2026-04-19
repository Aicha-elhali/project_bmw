import Anthropic from '@anthropic-ai/sdk';
import { parseGeneratedFiles } from '../generator/claudeClient.js';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a senior React engineer who fixes BMW iDrive automotive UI code.
You receive source files and a list of issues from QA review. Fix them according to BMW Automotive Design Constraints.

Rules:
1. Each corrected file starts with \`// FILE: <path>\` (e.g. \`// FILE: src/components/Navigation.jsx\`)
2. Output the COMPLETE file — not a diff. The entire file with fixes applied.
3. Only output files that need changes. Do not re-emit unchanged files.
4. Every .jsx file MUST have \`import React\` and \`export default ComponentName\`.
5. Do NOT output main.jsx — it is managed by the build system.
6. If a broken import is reported, create the missing component as a complete file OR remove the import and inline it.
7. Never output stub files, comments-only files, or "see above" placeholders.
8. Inline styles only. No CSS files, no className.

BMW Design Constraints (apply to ALL fixes):
- Dark theme surfaces must use 3 distinct levels: #0D0D0D (background), #1A1A1A (elevated), #262626 (overlay). Never pure #000000 or #FFFFFF.
- BMW Blue #1C69D4 for active/selected states. No warm gold, no sporty red as primary accent. Max 2 accent colors per screen.
- Font: "bmwTypeNextWeb", "Arial", "Helvetica", sans-serif — weight 300 default. NEVER use Inter, Roboto, or System-UI.
- Max 3 font-weight variants per screen. No ALL CAPS longer than 4 words. No body text below 14px.
- Touch targets: minimum 44px (2.75rem) for all interactive elements, preferred 48px (3rem).
- Icons: minimum 24px in interactive areas. Consistent style (all outline OR all filled, never mixed).
- border-radius: max 12px on primary containers. No playful/rounded corners.
- Animations: max 300ms for system feedback, prefer 150–200ms. Easing: ease-out for enter, ease-in-out for transitions. No spring/bouncy physics.
- No glassmorphism (backdrop-filter: blur). No neumorphism (inset shadows).
- No consumer-app patterns: no bottom nav bars, no hamburger menus, no gamification.
- Max 7 primary actions per screen. Max 3 levels of navigation depth.
- No emoji as icons. No pastel system colors. No purple/pink/green gradients.
- WCAG AA contrast minimum (4.5:1 for text).
- BMW DNA: precise, cool, technically superior, controlled — cockpit of a performance machine, not a consumer app.`;

function buildUserMessage(files, issues, tokens) {
  let msg = '## Issues to fix\n\n';
  msg += '```json\n' + JSON.stringify(issues, null, 2) + '\n```\n\n';
  msg += '## Current files\n\n';

  for (const [path, code] of files) {
    msg += `### ${path}\n\`\`\`jsx\n${code}\n\`\`\`\n\n`;
  }

  if (tokens) {
    msg += `## Design tokens\n\`\`\`json\n${JSON.stringify(tokens, null, 2)}\n\`\`\`\n\n`;
  }

  msg += 'Output ONLY the corrected files using `// FILE: path` format in fenced code blocks.';
  return msg;
}

export async function runFixAgent(files, issues, { apiKey, tokens }) {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32768,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(files, issues, tokens) }],
  });

  const finalMessage = await stream.finalMessage();

  const text = finalMessage.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  const parsed = parseGeneratedFiles(text);

  // Normalize paths: "src/components/Foo.jsx" → "src/components/Foo.jsx"
  // but also handle if fix agent returns just "Foo.jsx" → keep as-is (builder handles placement)
  const corrected = new Map();
  for (const [filename, code] of parsed) {
    // Skip main.jsx — we manage it
    if (filename === 'main.jsx' || filename === 'src/main.jsx') continue;

    // Normalize: strip leading "src/" for the file map,
    // but keep "src/components/..." structure for writing
    let path = filename;
    if (path.startsWith('src/')) {
      corrected.set(path, code);
    } else if (path.includes('/')) {
      corrected.set('src/' + path, code);
    } else {
      corrected.set('src/components/' + path, code);
    }
  }

  return corrected;
}
