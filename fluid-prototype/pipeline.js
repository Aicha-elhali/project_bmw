/**
 * Fluid Prototype Pipeline
 * ========================
 * Transforms a Figma frame into a runnable Vite + React app.
 *
 * Loads ALL token sets from ../token-pipeline/sets/ and passes them
 * to Claude, which decides per-component which tokens to apply.
 *
 * Usage:
 *   node pipeline.js --frame 16:4 --file TL9xgNNemU88nwUbSjiHQR
 *
 * Environment variables:
 *   FIGMA_TOKEN       — Figma personal access token
 *   ANTHROPIC_API_KEY — Claude API key
 */

import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';
import { readFile, readdir } from 'fs/promises';

import { getFigmaFrame }         from './src/figma/client.js';
import { transformFrame }        from './src/transformer/index.js';
import { buildGenerationPrompt } from './src/generator/promptBuilder.js';
import { generateComponents }    from './src/generator/claudeClient.js';
import { writeOutput }           from './src/output/builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(step, message, extra = '') {
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const pad = step.padEnd(12);
  console.log(`[${ts}] ${pad} ${message}${extra ? ' — ' + extra : ''}`);
}

function logWarn(message) {
  console.warn(`\x1b[33m  ⚠  ${message}\x1b[0m`);
}

function logSuccess(message) {
  console.log(`\x1b[32m  ✓  ${message}\x1b[0m`);
}

function logError(message) {
  console.error(`\x1b[31m  ✗  ${message}\x1b[0m`);
}

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1] ?? true;
      i++;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Load token sets from ../token-pipeline/sets/
// Falls back to local tokens/tokens.json if no sets directory exists.
// ---------------------------------------------------------------------------

async function loadTokenSets() {
  const setsDir = resolve(__dirname, '..', 'token-pipeline', 'sets');
  const sets = [];

  try {
    const files = await readdir(setsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

    for (const file of jsonFiles) {
      try {
        const raw    = await readFile(resolve(setsDir, file), 'utf-8');
        const tokens = JSON.parse(raw);
        const name   = tokens._meta?.name ?? file.replace('.json', '');
        sets.push({ name, tokens });
      } catch (err) {
        logWarn(`Skipping set "${file}": ${err.message}`);
      }
    }
  } catch {
    // sets directory doesn't exist — try local fallback
  }

  // Fallback: use tokens/tokens.json if no sets found
  if (sets.length === 0) {
    const fallback = resolve(__dirname, 'tokens', 'tokens.json');
    try {
      const raw    = await readFile(fallback, 'utf-8');
      const tokens = JSON.parse(raw);
      sets.push({ name: tokens._meta?.name ?? 'default', tokens });
      logWarn(`No sets in ../token-pipeline/sets/ — using local tokens/tokens.json as fallback`);
    } catch {
      logWarn('No token sets found and no local tokens/tokens.json — Claude will use defaults');
    }
  }

  return sets;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function run() {
  const args = parseArgs(process.argv);

  // Config
  const figmaToken    = process.env.FIGMA_TOKEN     ?? args.token ?? '';
  const anthropicKey  = process.env.ANTHROPIC_API_KEY ?? args.key ?? '';
  const figmaFileKey  = args.file   ?? 'TL9xgNNemU88nwUbSjiHQR';
  const figmaNodeId   = args.frame  ?? '16:4';
  const userPrompt    = args.prompt ?? '';
  const outputDir     = resolve(__dirname, 'output');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Fluid Prototype Pipeline');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('CONFIG', `File: ${figmaFileKey}  Node: ${figmaNodeId}`);
  log('CONFIG', `Output: ${outputDir}`);
  if (userPrompt) log('CONFIG', `Prompt: "${userPrompt}"`);
  console.log();

  // Validate required credentials
  if (!figmaToken) {
    logError('FIGMA_TOKEN is not set. Export it or pass --token <token>');
    process.exit(1);
  }
  if (!anthropicKey) {
    logError('ANTHROPIC_API_KEY is not set. Export it or pass --key <key>');
    process.exit(1);
  }

  // ── Phase 1: Fetch Figma Frame ──────────────────────────────────────────
  log('PHASE 1', 'Fetching Figma frame…');
  let figmaRaw;
  try {
    figmaRaw = await getFigmaFrame(figmaFileKey, figmaNodeId, figmaToken);
    logSuccess(`Frame "${figmaRaw.name}" fetched (${figmaRaw.children?.length ?? 0} top-level children)`);
  } catch (err) {
    logError(`Figma fetch failed: ${err.message}`);
    process.exit(1);
  }

  // ── Phase 2: Transform ──────────────────────────────────────────────────
  log('PHASE 2', 'Transforming Figma JSON…');
  const componentTree = transformFrame(figmaRaw);
  const nodeCount = countNodes(componentTree);
  logSuccess(`Transformed ${nodeCount} nodes into component tree`);

  // ── Phase 3: Load Token Sets ────────────────────────────────────────────
  log('PHASE 3', 'Loading token sets…');
  const tokenSets = await loadTokenSets();
  const setNames = tokenSets.map(s => s.name);
  logSuccess(`Loaded ${tokenSets.length} token set${tokenSets.length !== 1 ? 's' : ''}: ${setNames.join(', ')}`);

  // ── Phase 4: Claude Code Generation ────────────────────────────────────
  log('PHASE 4', 'Building Claude prompt…');
  const prompt = buildGenerationPrompt(componentTree, tokenSets, userPrompt);
  log('PHASE 4', `Prompt built`, `${prompt.length.toLocaleString()} chars, ${tokenSets.length} token sets`);

  log('PHASE 4', 'Sending to Claude API…');
  let generatedFiles;
  try {
    generatedFiles = await generateComponents(prompt, anthropicKey);
    logSuccess(`Claude generated ${generatedFiles.size} files: ${[...generatedFiles.keys()].join(', ')}`);
  } catch (err) {
    logError(`Claude generation failed: ${err.message}`);
    process.exit(1);
  }

  // ── Phase 5: Write Output ───────────────────────────────────────────────
  log('PHASE 5', 'Writing output files…');
  const written = await writeOutput(generatedFiles, outputDir);
  logSuccess(`Wrote ${written.length} files to ${outputDir}`);
  written.forEach(f => log('', `  → ${f}`));

  // ── Done ────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logSuccess('Pipeline complete!');
  console.log('\n  Next steps:');
  console.log(`    cd ${outputDir}`);
  console.log('    npm install');
  console.log('    npm run dev\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countNodes(node) {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

run().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
