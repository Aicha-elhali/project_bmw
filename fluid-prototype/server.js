/**
 * BMW HMI — Pipeline Server
 *
 * HTTP server that bridges the Figma plugin to the pipeline.
 * Receives a serialized Figma frame via POST, runs the full pipeline,
 * and streams NDJSON progress events back to the plugin UI.
 *
 *   node --env-file=.env server.js
 *
 * Endpoints:
 *   POST /api/generate  — accepts serialized frame JSON, streams progress
 */

import { createServer } from 'http';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

import { transformFrame }                from './src/transformer/index.js';
import { applyDesignTokens, loadTokens } from './src/design/tokenEngine.js';
import { resolveAPIs }                   from './src/generator/apiRegistry.js';
import { buildBackendPrompt }    from './src/generator/backendPromptBuilder.js';
import { buildFrontendPrompt }   from './src/generator/frontendPromptBuilder.js';
import { generateBackend, generateFrontend }  from './src/generator/claudeClient.js';
import { writeOutput }                   from './src/output/builder.js';
import { runValidationLoop }             from './src/validator/index.js';
import { classifyFrame, describePlacement, describeDefaultBackground } from './src/classifier/frameClassifier.js';
import { resolveModules, assembleInterfaceDoc, buildBackendFileMap } from './src/backend/_index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '3001', 10);

let viteProcess = null;

function sendEvent(res, event) {
  res.write(JSON.stringify(event) + '\n');
}

function countNodes(node) {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

async function startViteDevServer(outputDir) {
  if (viteProcess) {
    viteProcess.kill();
    viteProcess = null;
  }

  return new Promise((resolvePromise) => {
    const child = spawn('npx', ['vite', '--port', '5173', '--host'], {
      cwd: outputDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    viteProcess = child;
    let resolved = false;

    child.stdout.on('data', (data) => {
      const text = data.toString();
      if (!resolved && text.includes('Local:')) {
        resolved = true;
        resolvePromise('http://localhost:5173');
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      if (!resolved && text.includes('Local:')) {
        resolved = true;
        resolvePromise('http://localhost:5173');
      }
    });

    child.on('error', () => {
      if (!resolved) {
        resolved = true;
        resolvePromise('http://localhost:5173');
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolvePromise('http://localhost:5173');
      }
    }, 8000);
  });
}

async function handleGenerate(req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });

  let rawFrame;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    rawFrame = JSON.parse(Buffer.concat(chunks).toString());
  } catch (err) {
    sendEvent(res, { status: 'error', message: 'Invalid JSON body: ' + err.message });
    res.end();
    return;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
  const tokensPath   = resolve(__dirname, 'tokens', 'tokens.json');
  const outputDir    = resolve(__dirname, 'output');

  if (!anthropicKey) {
    sendEvent(res, { status: 'error', message: 'ANTHROPIC_API_KEY not set on server' });
    res.end();
    return;
  }

  try {
    const userPrompt = rawFrame.userPrompt || '';
    if (userPrompt) {
      delete rawFrame.userPrompt;
      sendEvent(res, { status: 'progress', phase: 'prompt', message: `User prompt: "${userPrompt.slice(0, 80)}${userPrompt.length > 80 ? '…' : ''}"` });
    }

    // Phase 2: Transform + Classify
    sendEvent(res, { status: 'progress', phase: 'transform', message: 'Transforming Figma frame…' });
    const tree = transformFrame(rawFrame);
    const classification = classifyFrame(rawFrame, tree);
    const classifiedFrames = [{
      nodeId: rawFrame.id ?? '0:0',
      raw: rawFrame,
      tree,
      classification,
    }];
    const totalNodes = countNodes(tree);
    sendEvent(res, { status: 'progress', phase: 'transform', message: `Classified "${classification.frameName}" → ${classification.frameType} (${totalNodes} nodes)` });

    // Phase 2.5: Resolve APIs
    sendEvent(res, { status: 'progress', phase: 'api', message: 'Detecting APIs…' });
    const apiConfig = resolveAPIs(tree);
    if (apiConfig.hasAPIs) {
      sendEvent(res, { status: 'progress', phase: 'api', message: `Detected ${apiConfig.detectedServices.length} services: ${apiConfig.detectedServices.join(', ')}` });
    } else {
      sendEvent(res, { status: 'progress', phase: 'api', message: 'No dynamic APIs detected — static output' });
    }

    // Phase 3: Design Tokens
    sendEvent(res, { status: 'progress', phase: 'tokens', message: 'Applying BMW HMI design tokens…' });
    const result = await applyDesignTokens(tree, tokensPath);
    classifiedFrames[0].tree = result.tree;
    const tokens = await loadTokens(tokensPath);
    sendEvent(res, { status: 'progress', phase: 'tokens', message: 'Design tokens applied' });

    // Phase 3.5: Resolve pre-built backend modules + assemble INTERFACE.md
    const resolvedModules = resolveModules(classification.screenContext);
    const prebuiltLabels = resolvedModules.modules.map(m => m.label);
    sendEvent(res, { status: 'progress', phase: 'backend-prebuilt', message: `Pre-built modules: ${prebuiltLabels.join(', ')}` });

    // For prompt builder: full picture of all available backend files
    let promptInterfaceDoc = await assembleInterfaceDoc(resolvedModules);
    const promptBackendFiles = buildBackendFileMap(resolvedModules);

    // For output writer: only Backend Agent generated files (pre-built are copied separately)
    let agentBackendFiles = null;
    let agentInterfaceDoc = null;

    // Phase 4a: Backend Agent — only for services not covered by pre-built modules
    const prebuiltIds = new Set(resolvedModules.modules.map(m => m.serviceId));
    const uncoveredAPIs = apiConfig.detectedServices.filter(label => {
      const id = label.toLowerCase().replace(/[^a-z]/g, '');
      return ![...prebuiltIds].some(pid => id.includes(pid) || pid.includes(id));
    });

    const needsBackendAgent = uncoveredAPIs.length > 0 || userPrompt.trim().length > 0;

    if (needsBackendAgent) {
      const reason = uncoveredAPIs.length > 0
        ? `Uncovered APIs: ${uncoveredAPIs.join(', ')}`
        : `Custom user prompt`;
      sendEvent(res, { status: 'progress', phase: 'backend', message: `Backend Agent — ${reason}` });
      const backendPrompt = buildBackendPrompt(classifiedFrames[0].tree, apiConfig, userPrompt);

      if (backendPrompt) {
        try {
          const backendResult = await generateBackend(backendPrompt, anthropicKey);
          agentBackendFiles = backendResult.files;
          agentInterfaceDoc = backendResult.interfaceDoc;
          for (const [k, v] of agentBackendFiles) promptBackendFiles.set(k, v);
          if (agentInterfaceDoc) {
            promptInterfaceDoc += '\n\n' + agentInterfaceDoc;
          }
          sendEvent(res, { status: 'progress', phase: 'backend', message: `Backend: ${agentBackendFiles.size} additional files generated` });
        } catch (err) {
          sendEvent(res, { status: 'progress', phase: 'backend', message: `Backend Agent failed: ${err.message} — continuing with pre-built` });
        }
      }
    } else {
      sendEvent(res, { status: 'progress', phase: 'backend', message: 'Skipped — all services pre-built' });
    }

    // Phase 4b: Frontend Agent
    sendEvent(res, { status: 'progress', phase: 'frontend', message: 'Frontend Agent generating UI…' });
    const frontendPrompt = buildFrontendPrompt(
      classifiedFrames[0].tree, tokens, apiConfig,
      promptInterfaceDoc, promptBackendFiles, userPrompt,
    );

    const frontendFiles = await generateFrontend(frontendPrompt, anthropicKey);
    sendEvent(res, { status: 'progress', phase: 'frontend', message: `Frontend: ${frontendFiles.size} files generated` });

    // Phase 5: Write Output
    sendEvent(res, { status: 'progress', phase: 'output', message: 'Writing output files…' });
    const written = await writeOutput(frontendFiles, outputDir, apiConfig, {
      backendFiles: agentBackendFiles,
      interfaceDoc: agentInterfaceDoc,
      resolvedModules,
    });
    sendEvent(res, { status: 'progress', phase: 'output', message: `Wrote ${written.length} files` });

    // Install dependencies
    sendEvent(res, { status: 'progress', phase: 'install', message: 'Installing dependencies…' });
    await new Promise((resolveInstall, rejectInstall) => {
      const child = spawn('npm', ['install'], {
        cwd: outputDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.on('close', (code) => {
        if (code === 0) resolveInstall();
        else rejectInstall(new Error(`npm install exited with code ${code}`));
      });
      child.on('error', rejectInstall);
    });
    sendEvent(res, { status: 'progress', phase: 'install', message: 'Dependencies installed' });

    // Phase 6: Validation
    sendEvent(res, { status: 'progress', phase: 'validate', message: 'Running validation…' });
    const validationResult = await runValidationLoop(outputDir, {
      apiKey: anthropicKey,
      maxIterations: 3,
      tokens,
      interfaceDoc: promptInterfaceDoc,
      userPrompt,
      onProgress: (msg) => sendEvent(res, { status: 'progress', phase: 'validate', message: msg }),
    });

    if (validationResult.approved) {
      sendEvent(res, { status: 'progress', phase: 'validate', message: 'All validation passed' });
    } else {
      sendEvent(res, { status: 'progress', phase: 'validate', message: `Validation: ${validationResult.issues.length} issues remaining` });
    }

    // Start Vite dev server
    sendEvent(res, { status: 'progress', phase: 'preview', message: 'Starting preview server…' });
    const previewUrl = await startViteDevServer(outputDir);

    sendEvent(res, { status: 'done', previewUrl });
  } catch (err) {
    sendEvent(res, { status: 'error', message: err.message });
  }

  res.end();
}

const server = createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate') {
    handleGenerate(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  BMW HMI Pipeline Server`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  Endpoint:   POST /api/generate\n`);
});

process.on('SIGINT', () => {
  if (viteProcess) viteProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (viteProcess) viteProcess.kill();
  process.exit(0);
});
