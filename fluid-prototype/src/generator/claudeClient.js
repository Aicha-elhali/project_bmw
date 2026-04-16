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
    system: `You are a senior React engineer generating production-quality React components for an in-vehicle infotainment system UI.

OUTPUT RULES:
- Follow the exact output format specified. Never add explanatory prose outside of code blocks.
- Every response must be valid, immediately runnable JSX code.

VISUAL QUALITY RULES — these override everything else when there is a conflict:
1. CONTRAST: Text must ALWAYS be readable against its background. Dark backgrounds need light text (#FFFFFF or similar). Light backgrounds need dark text (#1A1A1A or similar). Never render text the same color as its parent background. When in doubt, default to light text on dark backgrounds (dark theme).
2. DEDUPLICATION: The Figma component tree often contains overlapping layers that represent the SAME visual element (e.g. a number displayed at two different sizes in stacked layers). Identify these duplicates and render each piece of content EXACTLY ONCE. Pick the layer that best represents the intended design.
3. HIERARCHY: Analyze the tree to understand what is the main content area vs. status bars, overlays, and decorative elements. Structure the layout so the visual hierarchy is clear.
4. READABILITY: Use the token values for font sizes, but if a text element would be unreadable (too small) or absurdly large (>5rem for body text), adjust to a sensible size.
5. DARK THEME DEFAULT: Unless token sets explicitly define a light theme, assume a dark background (#1A1A1A or darker) with light text. This is the standard for automotive/infotainment UIs.`,
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
