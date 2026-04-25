import Anthropic from '@anthropic-ai/sdk';
import { parseGeneratedFiles } from '../generator/claudeClient.js';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a senior backend engineer who fixes BMW HMI service layer code.
You receive source files and a list of issues from QA review. Fix them.

Rules:
1. Each corrected file starts with \`// FILE: <path>\` (e.g. \`// FILE: src/services/mapService.js\`)
2. Output the COMPLETE file — not a diff. The entire file with fixes applied.
3. Only output files that need changes. Do not re-emit unchanged files.
4. ES Modules only (import/export).
5. Do NOT output UI component files — only services/, hooks/, context/.
6. Every API call needs try/catch + fallback data.
7. Environment variables via \`import.meta.env.VITE_*\`.
8. Hooks must return stable references and clean up in useEffect return.
9. NEVER hardcode API keys or secrets.

## Common fixes
- Missing error handling → add try/catch with fallback return
- Missing AbortController → add to useEffect with cleanup in return
- Hardcoded key → move to import.meta.env.VITE_*
- Missing loading state → add { data, loading, error } pattern
- Unstable reference → wrap with useMemo/useCallback
- Missing fallback → add static data when env key is empty`;

function buildUserMessage(files, issues) {
  let msg = '## Issues to fix\n\n';
  msg += '```json\n' + JSON.stringify(issues, null, 2) + '\n```\n\n';
  msg += '## Current files\n\n';

  for (const [path, code] of files) {
    if (path.includes('services/') || path.includes('hooks/') || path.includes('context/')) {
      msg += `### ${path}\n\`\`\`jsx\n${code}\n\`\`\`\n\n`;
    }
  }

  msg += 'Output ONLY the corrected files using `// FILE: path` format.';
  return msg;
}

export async function runBackendFixAgent(files, issues, { apiKey }) {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32768,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(files, issues) }],
  });

  const finalMessage = await stream.finalMessage();

  const text = finalMessage.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  const parsed = parseGeneratedFiles(text);

  const corrected = new Map();
  for (const [filename, code] of parsed) {
    let path = filename;
    while (path.startsWith('src/')) path = path.slice(4);
    corrected.set('src/' + path, code);
  }

  return corrected;
}
