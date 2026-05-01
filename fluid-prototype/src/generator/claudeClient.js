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

Every file starts with // FILE: and every response is valid, immediately runnable code. No explanatory prose outside of code blocks.

## Rules
- ES Modules only (import/export). No CommonJS.
- Environment variables via \`import.meta.env.VITE_*\` (Vite convention).
- Every API call needs try/catch and meaningful fallback data.
- Hooks return stable references (useMemo/useCallback where appropriate).
- Context providers must be self-contained with sensible defaults.
- Fetch calls include AbortController for cleanup.
- NEVER hardcode API keys — always read from environment.
- Services go in services/*.js, hooks in hooks/*.js, contexts in context/*.jsx.
- You MUST output an INTERFACE.md file documenting every export.
- NO UI components. NO JSX rendering. NO styling. Only data/logic layer.`;

export const FRONTEND_SYSTEM_PROMPT = `You are a senior React engineer and BMW HMI design expert who generates production-quality UI components for BMW iDrive automotive infotainment interfaces (Operating System X / Panoramic Vision style).

## CRITICAL: No Hallucinated UI Elements

Implement ONLY elements that exist in the provided wireframe/component tree. Do NOT invent, add, or "enhance" the UI with elements not in the input data. The component tree is the SINGLE SOURCE OF TRUTH.

## Output Format

Every file is wrapped in a \`\`\`jsx fenced code block starting with \`// FILE:\`:

\`\`\`jsx
// FILE: ComponentName.jsx
import React from 'react';
// complete component code...
export default ComponentName;
\`\`\`

## Output Rules

1. Each file starts with \`// FILE: ComponentName.jsx\`
2. Inline styles only — no CSS files, no className
3. ES Modules (import/export), no CommonJS
4. Functional components with hooks
5. Every \`// FILE:\` block is a complete, working component (import, function, JSX, export default)
6. Every import must resolve to a generated file or pre-built hmi/ component
7. For text nodes without content, use plausible German placeholder text — never lorem ipsum
8. No explanatory prose outside of code blocks

The BMW HMI Design System rules and implementation plan are provided in the user message.`;

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

/**
 * Send a prompt to Claude with tool-use support.
 * Claude can call tools (e.g. Figma MCP) during generation.
 * Runs an agentic loop until Claude stops calling tools.
 */
export async function generateWithTools(prompt, apiKey, systemPrompt, tools, toolHandler, label = 'Generating') {
  const client = new Anthropic({ apiKey });
  const MAX_TOOL_CALLS = 8;

  let messages = [{ role: 'user', content: prompt }];
  let totalText = '';
  let toolCallCount = 0;

  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
      tools,
    });

    const textParts = response.content.filter(b => b.type === 'text');
    const toolUses = response.content.filter(b => b.type === 'tool_use');

    for (const t of textParts) totalText += t.text;

    if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
      const chars = (totalText.length / 1000).toFixed(1);
      const files = (totalText.match(/\/\/ FILE:/g) || []).length;
      process.stderr.write(`\r  ⏳ ${label} complete: ${chars}k chars, ${files} files, ${toolCallCount} tool calls\n`);
      return totalText;
    }

    if (toolCallCount >= MAX_TOOL_CALLS) {
      process.stderr.write(`\n  ⚠  ${label}: max tool calls (${MAX_TOOL_CALLS}) reached, returning partial\n`);
      return totalText;
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    for (const tu of toolUses) {
      toolCallCount++;
      process.stderr.write(`\r  🔧 ${label}: tool call ${toolCallCount}/${MAX_TOOL_CALLS} → ${tu.name}`);
      try {
        const result = await toolHandler(tu.name, tu.input);
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
      } catch (err) {
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: [{ type: 'text', text: `Error: ${err.message}` }], is_error: true });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }
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

  const blockRegex = /```(?:jsx?|tsx?|md)?\n([\s\S]*?)```/g;
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
 * @param {{ tools?: Array, toolHandler?: Function }} [mcpOptions]
 * @returns {Promise<{ files: Map<string, string>, interfaceDoc: string|null }>}
 */
export async function generateBackend(prompt, apiKey, mcpOptions) {
  const raw = mcpOptions?.tools
    ? await generateWithTools(prompt, apiKey, BACKEND_SYSTEM_PROMPT, mcpOptions.tools, mcpOptions.toolHandler, 'Backend')
    : await generateWithClaude(prompt, apiKey, BACKEND_SYSTEM_PROMPT, 'Backend');
  const files = parseGeneratedFiles(raw);
  const interfaceDoc = extractInterfaceDoc(files);
  files.delete('INTERFACE.md');
  return { files, interfaceDoc };
}

/**
 * Generate frontend files (components, App.jsx).
 * @param {string} prompt
 * @param {string} apiKey
 * @param {{ tools?: Array, toolHandler?: Function }} [mcpOptions]
 * @returns {Promise<Map<string, string>>}
 */
export async function generateFrontend(prompt, apiKey, mcpOptions) {
  const raw = mcpOptions?.tools
    ? await generateWithTools(prompt, apiKey, FRONTEND_SYSTEM_PROMPT, mcpOptions.tools, mcpOptions.toolHandler, 'Frontend')
    : await generateWithClaude(prompt, apiKey, FRONTEND_SYSTEM_PROMPT, 'Frontend');
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
