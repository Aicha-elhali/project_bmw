/**
 * Claude API client for token extraction.
 *
 * Sends a multimodal message (image + text) and parses the JSON response.
 * Follows the same patterns as fluid-prototype/src/generator/claudeClient.js.
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL      = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

/**
 * Send the multimodal prompt to Claude and parse the JSON tokens response.
 *
 * @param {Array}  content — Content blocks (image + text) from prompt.js
 * @param {string} apiKey  — ANTHROPIC_API_KEY
 * @returns {Promise<object>} Parsed tokens object
 */
export async function extractTokens(content, apiKey) {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      'You are a design systems engineer. You analyse Figma designs (both visually and structurally) ' +
      'and produce semantic design token JSON files. You always return valid, complete JSON with every ' +
      'required field populated. You never include explanatory text outside the JSON code block.',
    messages: [
      { role: 'user', content },
    ],
  });

  // Extract text from response
  const raw = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  // Parse JSON from a fenced code block
  const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const jsonStr   = jsonMatch ? jsonMatch[1].trim() : raw.trim();

  let tokens;
  try {
    tokens = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `Claude did not return valid JSON.\n` +
      `Parse error: ${err.message}\n` +
      `Raw response (first 800 chars):\n${raw.slice(0, 800)}`
    );
  }

  // Sanity check: must have the top-level keys
  const required = ['colors', 'spacing', 'typography', 'fontWeights', 'borderRadius', 'shadows'];
  const missing  = required.filter(k => !tokens[k]);
  if (missing.length) {
    throw new Error(`Token response is missing required keys: ${missing.join(', ')}`);
  }

  return tokens;
}
