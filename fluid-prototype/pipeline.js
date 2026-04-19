/**
 * BMW iDrive Navigation — Figma-to-UI Pipeline
 * ==============================================
 * Transforms a Figma frame into a runnable Vite + React app
 * simulating a BMW center console navigation screen.
 * Automatically detects which APIs to use based on Figma layer names.
 *
 * Usage:
 *   node pipeline.js --frame 16:4 --file TL9xgNNemU88nwUbSjiHQR
 *
 * Environment variables:
 *   FIGMA_TOKEN       — Figma personal access token
 *   ANTHROPIC_API_KEY — Claude API key
 *   CLAUDE_MODEL      — Override model (default: claude-sonnet-4-6)
 */

import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';

import { getFigmaFrame }          from './src/figma/client.js';
import { transformFrame }         from './src/transformer/index.js';
import { applyDesignTokens, loadTokens } from './src/design/tokenEngine.js';
import { resolveAPIs }            from './src/generator/apiRegistry.js';
import { buildGenerationPrompt }  from './src/generator/promptBuilder.js';
import { generateComponents }     from './src/generator/claudeClient.js';
import { writeOutput }            from './src/output/builder.js';
import { runValidationLoop }      from './src/validator/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(step, message, extra = '') {
  const ts = new Date().toISOString().slice(11, 23);
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
// Pipeline
// ---------------------------------------------------------------------------

async function run() {
  const args = parseArgs(process.argv);

  const figmaToken    = process.env.FIGMA_TOKEN      ?? args.token ?? '';
  const anthropicKey  = process.env.ANTHROPIC_API_KEY ?? args.key   ?? '';
  const figmaFileKey  = args.file  ?? 'TL9xgNNemU88nwUbSjiHQR';
  const figmaNodeId   = args.frame ?? '16:4';
  const tokensPath    = resolve(__dirname, 'tokens', 'tokens.json');
  const outputDir     = args.output ? resolve(args.output) : resolve(__dirname, 'output');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  BMW iDrive Navigation — Figma → UI Pipeline');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('CONFIG', `File: ${figmaFileKey}  Node: ${figmaNodeId}`);
  log('CONFIG', `Output: ${outputDir}`);
  console.log();

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
  log('PHASE 2', 'Transforming Figma JSON → navigation component tree…');
  const componentTree = transformFrame(figmaRaw);
  const nodeCount = countNodes(componentTree);
  logSuccess(`Transformed ${nodeCount} nodes into navigation component tree`);

  // ── Phase 2.5: Resolve APIs ─────────────────────────────────────────────
  log('API', 'Detecting required APIs from component types…');
  const apiConfig = resolveAPIs(componentTree);
  if (apiConfig.hasAPIs) {
    logSuccess(`Detected ${apiConfig.detectedServices.length} services:`);
    apiConfig.detectedServices.forEach(s => log('', `  → ${s}`));
    if (Object.keys(apiConfig.packages).length > 0) {
      log('API', `Extra npm packages: ${Object.keys(apiConfig.packages).join(', ')}`);
    }
  } else {
    logWarn('No dynamic APIs detected — output will use static placeholders');
  }

  // ── Phase 3: Design Tokens ──────────────────────────────────────────────
  log('PHASE 3', 'Applying iDrive navigation design tokens…');
  const { tree: styledTree, warnings } = await applyDesignTokens(componentTree, tokensPath);
  if (warnings.length) warnings.forEach(logWarn);
  logSuccess(`Design tokens applied${warnings.length ? ` (${warnings.length} warnings)` : ''}`);

  // ── Phase 4: Claude Code Generation ────────────────────────────────────
  log('PHASE 4', 'Building Claude prompt…');
  const tokens = await loadTokens(tokensPath);
  const prompt = buildGenerationPrompt(styledTree, tokens, apiConfig);
  log('PHASE 4', `Prompt built`, `${prompt.length.toLocaleString()} chars`);

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
  const written = await writeOutput(generatedFiles, outputDir, apiConfig);
  logSuccess(`Wrote ${written.length} files to ${outputDir}`);
  written.forEach(f => log('', `  → ${f}`));

  // ── Phase 6: Validation Loop ─────────────────────────────────────────────
  log('PHASE 6', 'Running validation loop (testing agent + fix agent)…');
  const maxValidations = parseInt(args.maxValidations ?? '3', 10);
  const validationResult = await runValidationLoop(outputDir, {
    apiKey: anthropicKey,
    maxIterations: maxValidations,
    tokens,
    onProgress: (msg) => log('VALIDATE', msg),
  });

  if (validationResult.approved) {
    logSuccess(`Validation passed after ${validationResult.iterations} iteration(s)`);
  } else {
    logWarn(`Validation incomplete after ${validationResult.iterations} iteration(s)`);
    validationResult.issues.forEach(i => logWarn(`  [${i.severity}] ${i.file}: ${i.description}`));
  }

  // ── Done ────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logSuccess('Pipeline complete!');
  console.log('\n  Next steps:');
  console.log(`    cd ${outputDir}`);
  console.log('    npm install');
  console.log('    npm run dev\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
