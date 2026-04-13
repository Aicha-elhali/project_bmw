/**
 * Phase 4b — Claude API Client
 *
 * Sends the prompt to Claude and parses the generated code blocks
 * from the response into a map of { filename → code }.
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

/**
 * Send the generation prompt to Claude and return raw text.
 * @param {string} prompt
 * @param {string} apiKey — ANTHROPIC_API_KEY
 * @returns {Promise<string>}
 */
export async function generateWithClaude(prompt, apiKey) {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are a senior React engineer who generates clean, production-quality React components
from Figma wireframes. You always follow the exact output format specified and never add
explanatory prose outside of code blocks. Every response is valid, immediately runnable code.`,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  return message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

/**
 * Parse Claude's response into individual files.
 * Looks for patterns like:
 *   ```jsx
 *   // FILE: Button.jsx
 *   ...code...
 *   ```
 *
 * @param {string} rawResponse
 * @returns {Map<string, string>}  filename → code
 */
export function parseGeneratedFiles(rawResponse) {
  const files = new Map();

  // Match all fenced code blocks (```jsx ... ``` or ```js ... ```)
  const blockRegex = /```(?:jsx?|tsx?)\n([\s\S]*?)```/g;
  let match;

  while ((match = blockRegex.exec(rawResponse)) !== null) {
    const blockContent = match[1].trim();

    // Extract filename from first line comment: // FILE: Foo.jsx
    const fileLineMatch = blockContent.match(/^\/\/\s*FILE:\s*([^\n]+)/);
    if (fileLineMatch) {
      const filename = fileLineMatch[1].trim();
      // Strip the FILE comment line from the code
      const code = blockContent.replace(/^\/\/\s*FILE:\s*[^\n]+\n/, '').trim();
      files.set(filename, code);
    } else {
      // Fallback: try to detect file from import/export pattern
      const exportMatch = blockContent.match(/export default (\w+)/);
      if (exportMatch) {
        const filename = `${exportMatch[1]}.jsx`;
        if (!files.has(filename)) {
          files.set(filename, blockContent);
        }
      }
    }
  }

  return files;
}

/**
 * Full step: generate + parse.
 * @param {string} prompt
 * @param {string} apiKey
 * @returns {Promise<Map<string, string>>}
 */
export async function generateComponents(prompt, apiKey) {
  const raw = await generateWithClaude(prompt, apiKey);
  const files = parseGeneratedFiles(raw);

  if (files.size === 0) {
    throw new Error(
      'Claude returned no parseable code blocks. Raw response:\n' + raw.slice(0, 500)
    );
  }

  return files;
}
