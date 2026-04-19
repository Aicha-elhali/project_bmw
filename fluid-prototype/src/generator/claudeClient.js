/**
 * Phase 4b — Claude API Client (Streaming)
 *
 * Sends the prompt to Claude using streaming to handle long generation
 * times (32K+ tokens). Parses the response into { filename → code }.
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL      = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';
const MAX_TOKENS = 32768;

/**
 * Send the generation prompt to Claude via streaming and return raw text.
 * Shows a live character counter during generation.
 * @param {string} prompt
 * @param {string} apiKey — ANTHROPIC_API_KEY
 * @returns {Promise<string>}
 */
export async function generateWithClaude(prompt, apiKey) {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are a senior React engineer who generates clean, production-quality React components for BMW iDrive automotive infotainment interfaces. You follow the exact output format specified — every file starts with // FILE: and every response is valid, immediately runnable code. You never add explanatory prose outside of code blocks.`,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  // Show progress during generation
  let charCount = 0;
  let fileCount = 0;
  stream.on('text', (text) => {
    charCount += text.length;
    // Detect new file boundaries for progress feedback
    if (text.includes('// FILE:')) fileCount++;
    // Update progress every ~1000 chars
    if (charCount % 1000 < text.length) {
      process.stderr.write(`\r  ⏳ Generating… ${(charCount / 1000).toFixed(1)}k chars, ${fileCount} files detected`);
    }
  });

  const finalMessage = await stream.finalMessage();
  process.stderr.write(`\r  ⏳ Generation complete: ${(charCount / 1000).toFixed(1)}k chars, ${fileCount} files\n`);

  return finalMessage.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

/**
 * Parse Claude's response into individual files.
 * Supports flat filenames (Button.jsx) and paths (services/foo.js, hooks/bar.js).
 *
 * @param {string} rawResponse
 * @returns {Map<string, string>}  filename → code
 */
export function parseGeneratedFiles(rawResponse) {
  const files = new Map();

  const blockRegex = /```(?:jsx?|tsx?)\n([\s\S]*?)```/g;
  let match;

  while ((match = blockRegex.exec(rawResponse)) !== null) {
    const blockContent = match[1].trim();

    // Extract filename from: // FILE: ComponentName.jsx or // FILE: services/foo.js
    const fileLineMatch = blockContent.match(/^\/\/\s*FILE:\s*([^\n]+)/);
    if (fileLineMatch) {
      const filename = fileLineMatch[1].trim();
      const code = blockContent.replace(/^\/\/\s*FILE:\s*[^\n]+\n/, '').trim();
      files.set(filename, code);
    } else {
      // Fallback: detect from export default
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
 * Full step: generate (streaming) + parse.
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
