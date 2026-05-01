/**
 * BMW HMI — Figma-to-UI Pipeline
 * ================================
 * Transforms one or more Figma frames into a runnable Vite + React app
 * using the BMW HMI Design System (Operating System X / Panoramic Vision).
 *
 * Pipeline phases:
 *   1.  Fetch Figma frames
 *   2.  Transform + Classify
 *   2.5 Detect APIs
 *   3.  Apply design tokens
 *   4a. Backend Agent (services, hooks, contexts) — skipped if no APIs
 *   4b. Frontend Agent (UI components, App.jsx)
 *   5.  Write output
 *   6a. Backend validation loop
 *   6b. Design validation loop
 *
 * Usage:
 *   node pipeline.js --frame 16:4
 *   node pipeline.js --frame 16:4,16:5,16:6
 *
 * Environment variables:
 *   FIGMA_TOKEN       — Figma personal access token
 *   ANTHROPIC_API_KEY — Claude API key
 *   CLAUDE_MODEL      — Override model (default: claude-opus-4-6)
 */

import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';

import { getFigmaFrame, getFigmaFrames, getFigmaScreenshot, setUseMCP, closeMCP } from './src/figma/client.js';
import { buildFigmaToolDefinitions, handleToolCall } from './src/figma/mcpToolDefinitions.js';
import { transformFrame }                from './src/transformer/index.js';
import { applyDesignTokens, loadTokens } from './src/design/tokenEngine.js';
import { resolveAPIs }                   from './src/generator/apiRegistry.js';
import { buildBackendPrompt, buildMultiFrameBackendPrompt } from './src/generator/backendPromptBuilder.js';
import { buildFrontendPrompt, buildMultiFrameFrontendPrompt } from './src/generator/frontendPromptBuilder.js';
import { generateBackend, generateFrontend }  from './src/generator/claudeClient.js';
import { writeOutput }                   from './src/output/builder.js';
import { runValidationLoop }             from './src/validator/index.js';
import { classifyFrame, describePlacement, describeDefaultBackground } from './src/classifier/frameClassifier.js';

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
  const args = { frames: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--frame' && argv[i + 1]) {
      const ids = argv[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      args.frames.push(...ids);
      i++;
    } else if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1] ?? true;
      i++;
    }
  }
  if (args.frames.length === 0 && args.frame) {
    args.frames = args.frame.split(',').map(s => s.trim()).filter(Boolean);
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
  const frameIds      = args.frames.length > 0 ? args.frames : ['76:25'];
  const tokensPath    = resolve(__dirname, 'tokens', 'tokens.json');
  const outputDir     = args.output ? resolve(args.output) : resolve(__dirname, 'output');
  const isMultiFrame  = frameIds.length > 1;
  const useRest       = args['use-rest'] === true;

  if (useRest) {
    setUseMCP(false);
    log('CONFIG', 'Using REST API (--use-rest)');
  } else {
    log('CONFIG', 'Using Figma MCP (fallback to REST if unavailable)');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  BMW HMI — Figma → UI Pipeline (Backend + Frontend)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('CONFIG', `File: ${figmaFileKey}`);
  log('CONFIG', `Frames: ${frameIds.join(', ')}${isMultiFrame ? ` (${frameIds.length} frames)` : ''}`);
  log('CONFIG', `Output: ${outputDir}`);
  console.log();

  if (!figmaToken) { logError('FIGMA_TOKEN not set'); process.exit(1); }
  if (!anthropicKey) { logError('ANTHROPIC_API_KEY not set'); process.exit(1); }

  // ── Phase 1: Fetch Figma Frames ────────────────────────────────────────
  log('PHASE 1', `Fetching ${frameIds.length} Figma frame(s)…`);
  let rawFrameList;
  try {
    if (isMultiFrame) {
      const framesMap = await getFigmaFrames(figmaFileKey, frameIds, figmaToken);
      rawFrameList = [...framesMap.entries()].map(([id, raw]) => ({ nodeId: id, raw }));
      logSuccess(`Fetched ${rawFrameList.length} frames: ${rawFrameList.map(f => `"${f.raw.name}"`).join(', ')}`);
    } else {
      const raw = await getFigmaFrame(figmaFileKey, frameIds[0], figmaToken);
      rawFrameList = [{ nodeId: frameIds[0], raw }];
      logSuccess(`Frame "${raw.name}" fetched (${raw.children?.length ?? 0} top-level children)`);
    }
  } catch (err) {
    logError(`Figma fetch failed: ${err.message}`);
    process.exit(1);
  }

  // ── Phase 1b: Fetch Screenshot (MCP only) ──────────────────────────────
  let figmaScreenshot = null;
  if (!useRest) {
    log('PHASE 1b', 'Fetching Figma screenshot via MCP…');
    try {
      figmaScreenshot = await getFigmaScreenshot(figmaFileKey, frameIds[0], figmaToken);
      if (figmaScreenshot) {
        logSuccess('Screenshot captured for validation');
      } else {
        logWarn('Screenshot not available');
      }
    } catch {
      logWarn('Screenshot fetch failed — continuing without');
    }
  }

  // ── Phase 2: Transform + Classify ──────────────────────────────────────
  log('PHASE 2', 'Transforming + classifying frames…');
  const classifiedFrames = [];
  for (const { nodeId, raw } of rawFrameList) {
    const tree = transformFrame(raw);
    const classification = classifyFrame(raw, tree);
    classifiedFrames.push({ nodeId, raw, tree, classification });

    const symbol = classification.isPartial ? '◇' : '■';
    logSuccess(`${symbol} "${classification.frameName}" → ${classification.frameType} (${classification.placement})`);
  }

  const totalNodes = classifiedFrames.reduce((sum, f) => sum + countNodes(f.tree), 0);
  logSuccess(`${totalNodes} total nodes across ${classifiedFrames.length} frame(s)`);

  // ── Phase 2.5: Resolve APIs ────────────────────────────────────────────
  log('API', 'Detecting required APIs from component types…');
  const mergedTree = {
    type: 'screen', label: 'MergedRoot', children: classifiedFrames.map(f => f.tree),
    layout: { direction: 'column' }, style: {},
  };
  const apiConfig = resolveAPIs(mergedTree);
  if (apiConfig.hasAPIs) {
    logSuccess(`Detected ${apiConfig.detectedServices.length} services: ${apiConfig.detectedServices.join(', ')}`);
  } else {
    logWarn('No dynamic APIs detected — static output');
  }

  // ── Phase 3: Design Tokens ─────────────────────────────────────────────
  log('PHASE 3', 'Applying BMW HMI design tokens…');
  const warnings = [];
  for (const f of classifiedFrames) {
    const result = await applyDesignTokens(f.tree, tokensPath);
    f.tree = result.tree;
    warnings.push(...result.warnings);
  }
  if (warnings.length) warnings.forEach(logWarn);
  logSuccess(`Design tokens applied${warnings.length ? ` (${warnings.length} warnings)` : ''}`);

  const tokens = await loadTokens(tokensPath);

  // ── Prepare MCP tools for Claude agents ─────────────────────────────────
  const mcpOptions = !useRest ? {
    tools: buildFigmaToolDefinitions(figmaFileKey, frameIds),
    toolHandler: (name, input) => handleToolCall(name, input, figmaFileKey),
  } : null;

  if (mcpOptions) {
    log('MCP', `${mcpOptions.tools.length} Figma tools available for Claude agents`);
  }

  // ── Phase 4a: Backend Agent ────────────────────────────────────────────
  let backendFiles = null;
  let interfaceDoc = null;

  if (apiConfig.hasAPIs) {
    log('PHASE 4a', 'Building backend prompt…');
    const backendPrompt = isMultiFrame
      ? buildMultiFrameBackendPrompt(classifiedFrames, apiConfig)
      : buildBackendPrompt(classifiedFrames[0].tree, apiConfig);

    if (backendPrompt) {
      log('PHASE 4a', `Backend prompt: ${backendPrompt.length.toLocaleString()} chars`);
      log('PHASE 4a', 'Sending to Backend Agent…');
      try {
        const result = await generateBackend(backendPrompt, anthropicKey, mcpOptions);
        backendFiles = result.files;
        interfaceDoc = result.interfaceDoc;
        logSuccess(`Backend Agent generated ${backendFiles.size} files: ${[...backendFiles.keys()].join(', ')}`);
        if (interfaceDoc) {
          logSuccess(`INTERFACE.md generated (${interfaceDoc.length} chars)`);
        } else {
          logWarn('Backend Agent did not generate INTERFACE.md');
        }
      } catch (err) {
        logWarn(`Backend Agent failed: ${err.message} — continuing with frontend only`);
      }
    }
  } else {
    log('PHASE 4a', 'Skipped — no APIs detected');
  }

  // ── Phase 4b: Frontend Agent ───────────────────────────────────────────
  log('PHASE 4b', 'Building frontend prompt…');
  let frontendPrompt;
  const mcpContext = mcpOptions ? { fileKey: figmaFileKey, nodeIds: frameIds } : null;

  if (isMultiFrame || classifiedFrames.some(f => f.classification.isPartial)) {
    frontendPrompt = buildMultiFrameFrontendPrompt(
      classifiedFrames, tokens, apiConfig,
      { describePlacement, describeDefaultBackground },
      interfaceDoc, backendFiles, '', mcpContext,
    );
    log('PHASE 4b', `Multi-frame frontend prompt: ${frontendPrompt.length.toLocaleString()} chars`);
  } else {
    frontendPrompt = buildFrontendPrompt(
      classifiedFrames[0].tree, tokens, apiConfig,
      interfaceDoc, backendFiles, '', mcpContext,
    );
    log('PHASE 4b', `Single-frame frontend prompt: ${frontendPrompt.length.toLocaleString()} chars`);
  }

  log('PHASE 4b', 'Sending to Frontend Agent…');
  let frontendFiles;
  try {
    frontendFiles = await generateFrontend(frontendPrompt, anthropicKey, mcpOptions);
    logSuccess(`Frontend Agent generated ${frontendFiles.size} files: ${[...frontendFiles.keys()].join(', ')}`);
  } catch (err) {
    logError(`Frontend Agent failed: ${err.message}`);
    process.exit(1);
  }

  // ── Phase 5: Write Output ──────────────────────────────────────────────
  log('PHASE 5', 'Writing output files…');
  const written = await writeOutput(frontendFiles, outputDir, apiConfig, {
    backendFiles,
    interfaceDoc,
  });
  logSuccess(`Wrote ${written.length} files to ${outputDir}`);
  written.forEach(f => log('', `  → ${f}`));

  // ── Phase 6: Validation Loops ──────────────────────────────────────────
  log('PHASE 6', 'Running validation loops…');
  const maxValidations = parseInt(args.maxValidations ?? '3', 10);
  const validationResult = await runValidationLoop(outputDir, {
    apiKey: anthropicKey,
    maxIterations: maxValidations,
    tokens,
    interfaceDoc,
    componentTrees: classifiedFrames.map(f => f.tree),
    figmaScreenshot,
    onProgress: (msg) => log('VALIDATE', msg),
  });

  if (validationResult.backendApproved !== undefined) {
    if (validationResult.backendApproved) {
      logSuccess(`Backend validation passed`);
    } else {
      logWarn(`Backend validation: issues remain`);
    }
    if (validationResult.designApproved) {
      logSuccess(`Design validation passed`);
    } else {
      logWarn(`Design validation: issues remain`);
    }
  }

  if (validationResult.approved) {
    logSuccess(`All validation passed after ${validationResult.iterations} total iteration(s)`);
  } else {
    logWarn(`Validation incomplete after ${validationResult.iterations} total iteration(s)`);
    validationResult.issues.forEach(i => logWarn(`  [${i.severity}] ${i.file}: ${i.description}`));
  }

  // ── Done ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logSuccess('Pipeline complete!');
  if (isMultiFrame) {
    console.log(`\n  Processed ${classifiedFrames.length} frames:`);
    classifiedFrames.forEach(f => {
      const symbol = f.classification.isPartial ? '◇' : '■';
      console.log(`    ${symbol} "${f.classification.frameName}" → ${f.classification.frameType}`);
    });
  }
  if (backendFiles && backendFiles.size > 0) {
    console.log(`\n  Backend: ${backendFiles.size} service files generated`);
  }
  console.log('\n  Next steps:');
  console.log(`    cd ${outputDir}`);
  console.log('    npm install');
  console.log('    npm run dev\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Cleanup MCP connection ────────────────────────────────────────────
  await closeMCP().catch(() => {});
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
