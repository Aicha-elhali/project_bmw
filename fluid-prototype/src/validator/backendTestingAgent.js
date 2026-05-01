import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a senior backend QA engineer for BMW HMI automotive prototypes.
You review generated React service layers (services, hooks, contexts) for correctness and robustness.

Analyze the files for these categories:

## Critical (app will crash)
- Missing exports that other files depend on
- Syntax errors (unclosed brackets, undefined variables)
- Hooks called outside of React component/hook context (module-level)
- Context used without matching Provider
- Circular imports between services/hooks/contexts
- import.meta.env used incorrectly (wrong prefix, missing VITE_)

## Warning (degraded functionality)
- API calls without try/catch or error handling
- Missing fallback data when API key is not set
- Fetch calls without AbortController cleanup in useEffect
- Hooks not returning stable references (objects/arrays recreated every render)
- Hardcoded API keys or secrets in source code
- Missing loading/error states in hook return values
- Context providers without default values
- Services that don't match their INTERFACE.md documentation
- Race conditions (stale closures in useEffect, missing dependency arrays)
- Timeouts not configured for external API calls

Respond with ONLY this JSON, no other text:
{
  "approved": boolean,
  "summary": "one-line assessment",
  "issues": [
    {
      "file": "src/services/foo.js",
      "severity": "critical" | "warning",
      "rule": "missing-export | syntax-error | hook-outside-component | missing-provider | circular-import | wrong-env-prefix | no-error-handling | no-fallback | no-abort-cleanup | unstable-reference | hardcoded-secret | missing-loading-state | no-default-context | interface-mismatch | race-condition | no-timeout | other",
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ]
}

Set "approved" to false ONLY if there are critical issues. Warnings alone do NOT block approval.
Only review files in services/, hooks/, context/ directories. Ignore component and UI files.`;

function buildUserMessage(files, interfaceDoc) {
  let msg = 'Review these BMW HMI backend/service files for correctness.\n\n';
  msg += '## Available files\n\n';
  msg += [...files.keys()].map(f => `- ${f}`).join('\n');
  msg += '\n\n## File contents\n\n';

  for (const [path, code] of files) {
    if (path.includes('services/') || path.includes('hooks/') || path.includes('context/')) {
      msg += `### ${path}\n\`\`\`jsx\n${code}\n\`\`\`\n\n`;
    }
  }

  if (interfaceDoc) {
    msg += `## INTERFACE.md (contract)\n\`\`\`md\n${interfaceDoc}\n\`\`\`\n\n`;
    msg += 'Verify that all services/hooks/contexts match the interface documentation.\n';
  }

  return msg;
}

function parseJsonResponse(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

export async function runBackendTestingAgent(files, { apiKey, interfaceDoc }) {
  const backendFiles = new Map(
    [...files.entries()].filter(([p]) =>
      p.includes('services/') || p.includes('hooks/') || p.includes('context/')
    )
  );

  if (backendFiles.size === 0) {
    return { approved: true, summary: 'No backend files to review', issues: [] };
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(files, interfaceDoc) }],
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
      summary: 'Backend testing agent returned unparseable response',
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
