#!/usr/bin/env node
/**
 * AI-Powered Token Pipeline
 * ==========================
 * Renders a Figma frame as an image, collects its structural data,
 * and sends both to Claude to produce semantic design tokens.
 *
 * Usage:
 *   node pipeline.js --file <FILE_KEY> --frame <NODE_ID>
 *
 * Options:
 *   --file     Figma file key (from URL)                             [required]
 *   --frame    Frame node ID, e.g. "16-495" or "16:495"              [required]
 *   --token    Figma personal access token (or set FIGMA_TOKEN)
 *   --key      Anthropic API key (or set ANTHROPIC_API_KEY)
 *   --output   Destination for tokens.json
 *              (default: ../fluid-prototype/tokens/tokens.json)
 *   --dry-run  Print tokens to stdout without writing
 *   --scale    Image export scale 1–4 (default: 2)
 *
 * Environment:
 *   FIGMA_TOKEN        Figma personal access token
 *   ANTHROPIC_API_KEY  Claude API key
 *   CLAUDE_MODEL       Model override (default: claude-sonnet-4-6)
 */

import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';
import { writeFile, mkdir }  from 'fs/promises';

import { fetchFrame, fetchFrameImage } from './src/figma.js';
import { collectFrameData }            from './src/collector.js';
import { buildPromptContent }          from './src/prompt.js';
import { extractTokens }              from './src/claude.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const ts   = () => new Date().toISOString().slice(11, 23);
const log  = (step, msg, extra = '') =>
  console.log(`[${ts()}] ${step.padEnd(10)} ${msg}${extra ? ' — ' + extra : ''}`);
const ok   = (m) => console.log(`\x1b[32m  ✓  ${m}\x1b[0m`);
const fail = (m) => console.error(`\x1b[31m  ✗  ${m}\x1b[0m`);

// ---------------------------------------------------------------------------
// Arg parser
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key  = argv[i].slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { args[key] = true; }
      else { args[key] = next; i++; }
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const args = parseArgs(process.argv);

  const figmaToken   = process.env.FIGMA_TOKEN      ?? args.token ?? '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? args.key   ?? '';
  const fileKey      = args.file  ?? '';
  const frameId      = args.frame ?? '';
  const dryRun       = Boolean(args['dry-run']);
  const scale        = Number(args.scale) || 2;
  const outputPath   = args.output
    ? resolve(args.output)
    : resolve(__dirname, '..', 'fluid-prototype', 'tokens', 'tokens.json');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  AI Token Pipeline  (vision + structural)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate
  const errors = [];
  if (!figmaToken)   errors.push('FIGMA_TOKEN not set — export it or pass --token');
  if (!anthropicKey) errors.push('ANTHROPIC_API_KEY not set — export it or pass --key');
  if (!fileKey)      errors.push('--file <figma-file-key> is required');
  if (!frameId)      errors.push('--frame <node-id> is required');
  if (errors.length) {
    errors.forEach(fail);
    console.log('\nUsage: node pipeline.js --file <FILE_KEY> --frame <NODE_ID>\n');
    process.exit(1);
  }

  log('CONFIG', `File:   ${fileKey}`);
  log('CONFIG', `Frame:  ${frameId}`);
  log('CONFIG', `Output: ${dryRun ? '(dry-run)' : outputPath}`);
  log('CONFIG', `Model:  ${process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6'}`);
  log('CONFIG', `Scale:  ${scale}x`);
  console.log();

  // ── 1. Fetch frame data + image in parallel ────────────────────────────
  log('FIGMA', 'Fetching frame data and rendering image…');

  let frame, imageBase64;
  try {
    [frame, imageBase64] = await Promise.all([
      fetchFrame(fileKey, frameId, figmaToken),
      fetchFrameImage(fileKey, frameId, figmaToken, scale),
    ]);
  } catch (err) {
    fail(`Figma fetch failed: ${err.message}`);
    process.exit(1);
  }

  const imgSizeKB = Math.round(imageBase64.length * 0.75 / 1024);
  ok(`Frame "${frame.name}" fetched`);
  ok(`Image rendered (${imgSizeKB} KB)`);

  // ── 2. Collect structural data ─────────────────────────────────────────
  log('COLLECT', 'Walking node tree…');
  const collected = collectFrameData(frame);
  ok(
    `${collected.nodeCount} nodes — ` +
    `${collected.solidFills.length} colors, ` +
    `${collected.gradients.length} gradients, ` +
    `${collected.textStyles.length} text styles, ` +
    `${collected.spacings.length} spacings, ` +
    `${collected.cornerRadii.length} radii, ` +
    `${collected.shadows.length} shadows`
  );

  // ── 3. Build prompt and call Claude ────────────────────────────────────
  log('CLAUDE', 'Building multimodal prompt (image + data)…');
  const content = buildPromptContent(imageBase64, collected, { fileKey, frameId });
  ok('Prompt built');

  log('CLAUDE', 'Sending to Claude API (this may take a moment)…');
  let tokens;
  try {
    tokens = await extractTokens(content, anthropicKey);
  } catch (err) {
    fail(`Claude extraction failed: ${err.message}`);
    process.exit(1);
  }
  ok(`Tokens extracted — ${Object.keys(tokens.colors ?? {}).length} colors, ${Object.keys(tokens.typography ?? {}).length} type styles`);

  // ── 4. Write output ────────────────────────────────────────────────────
  if (dryRun) {
    console.log('\n── Generated tokens (dry-run) ─────────────────────────────────\n');
    console.log(JSON.stringify(tokens, null, 2));
    console.log('\n───────────────────────────────────────────────────────────────\n');
  } else {
    log('WRITE', `Writing to ${outputPath}…`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(tokens, null, 2) + '\n', 'utf-8');
    ok(`Tokens written to ${outputPath}`);
  }

  // ── Done ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  ok('Token extraction complete!');

  if (!dryRun) {
    console.log('\n  Next step — run the prototype pipeline with new tokens:');
    console.log('    cd ../fluid-prototype');
    console.log(`    node pipeline.js --file ${fileKey} --frame ${frameId}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
