#!/usr/bin/env node
/**
 * AI-Powered Token Pipeline
 * ==========================
 * Renders a Figma frame as an image, collects its structural data,
 * sends both to Claude to produce semantic design tokens, and saves
 * the result as a named set in sets/.
 *
 * Usage:
 *   node pipeline.js --file <FILE_KEY> --frame <NODE_ID>
 *
 * Options:
 *   --file     Figma file key (from URL)                             [required]
 *   --frame    Frame node ID, e.g. "16-495" or "16:495"              [required]
 *   --token    Figma personal access token (or set FIGMA_TOKEN)
 *   --key      Anthropic API key (or set ANTHROPIC_API_KEY)
 *   --name     Force a set name (skip interactive prompt)
 *   --dry-run  Print tokens to stdout without writing
 *   --scale    Image export scale 1–4 (default: 2)
 *
 * Environment:
 *   FIGMA_TOKEN        Figma personal access token
 *   ANTHROPIC_API_KEY  Claude API key
 *   CLAUDE_MODEL       Model override (default: claude-sonnet-4-6)
 */

import { resolve, dirname }            from 'path';
import { fileURLToPath }               from 'url';
import { writeFile, mkdir, readdir }   from 'fs/promises';
import { createInterface }             from 'readline';

import { fetchFrame, fetchFrameImage } from './src/figma.js';
import { collectFrameData }            from './src/collector.js';
import { buildPromptContent }          from './src/prompt.js';
import { extractTokens }              from './src/claude.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETS_DIR  = resolve(__dirname, 'sets');

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const ts   = () => new Date().toISOString().slice(11, 23);
const log  = (step, msg, extra = '') =>
  console.log(`[${ts()}] ${step.padEnd(10)} ${msg}${extra ? ' — ' + extra : ''}`);
const ok   = (m) => console.log(`\x1b[32m  ✓  ${m}\x1b[0m`);
const fail = (m) => console.error(`\x1b[31m  ✗  ${m}\x1b[0m`);
const dim  = (m) => console.log(`\x1b[2m    ${m}\x1b[0m`);

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
// Interactive prompt
// ---------------------------------------------------------------------------

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => {
    rl.question(question, answer => { rl.close(); res(answer.trim()); });
  });
}

// ---------------------------------------------------------------------------
// List existing sets
// ---------------------------------------------------------------------------

async function listExistingSets() {
  try {
    const files = await readdir(SETS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
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
  const forceName    = args.name  ?? null;
  const scale        = Number(args.scale) || 2;

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
  log('CONFIG', `Model:  ${process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6'}`);
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
  const existingSets = await listExistingSets();

  log('CLAUDE', 'Building multimodal prompt (image + data)…');
  const content = buildPromptContent(imageBase64, collected, { fileKey, frameId }, existingSets);
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

  // ── 4. Name the set ────────────────────────────────────────────────────
  const suggestedName = tokens._meta?.name ?? frame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const suggestedDesc = tokens._meta?.description ?? '';

  let setName;

  if (forceName) {
    setName = forceName;
  } else if (dryRun) {
    setName = suggestedName;
  } else {
    console.log();
    console.log('  Claude suggests:');
    console.log(`    Name:        \x1b[1m${suggestedName}\x1b[0m`);
    console.log(`    Description: ${suggestedDesc}`);
    if (existingSets.length > 0) {
      console.log(`    Existing:    ${existingSets.join(', ')}`);
    }
    console.log();

    const answer = await ask(`  Set name [${suggestedName}]: `);
    setName = answer || suggestedName;
  }

  // Sanitise
  setName = setName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // ── 5. Write to sets/ ──────────────────────────────────────────────────
  if (dryRun) {
    console.log('\n── Generated tokens (dry-run) ─────────────────────────────────\n');
    console.log(JSON.stringify(tokens, null, 2));
    console.log('\n───────────────────────────────────────────────────────────────\n');
  } else {
    await mkdir(SETS_DIR, { recursive: true });
    const outputPath = resolve(SETS_DIR, `${setName}.json`);
    const existed    = existingSets.includes(setName);

    await writeFile(outputPath, JSON.stringify(tokens, null, 2) + '\n', 'utf-8');
    ok(`${existed ? 'Updated' : 'Created'} set "${setName}" → ${outputPath}`);
  }

  // ── Done ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  ok('Token extraction complete!');
  console.log(`\n  The set "${setName}" is now available to the fluid-prototype pipeline.`);
  console.log('  Run the prototype pipeline — it will pick from all available sets:\n');
  console.log(`    cd ../fluid-prototype`);
  console.log(`    node pipeline.js --file ${fileKey} --frame ${frameId}`);
  console.log('\n  Or describe what the UI should show:\n');
  console.log(`    node pipeline.js --file ${fileKey} --frame ${frameId} --prompt "navigation with speed 120kmh"`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
