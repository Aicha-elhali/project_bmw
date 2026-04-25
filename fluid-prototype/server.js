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

import { parseHtmlToFigmaJson }           from './src/converter/htmlConverter.js';
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

// ---------------------------------------------------------------------------
// Shared pipeline: rawFrame → transform → generate → validate → preview
// ---------------------------------------------------------------------------

async function runPipelineFromFrame(rawFrame, res) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
  const tokensPath   = resolve(__dirname, 'tokens', 'tokens.json');
  const outputDir    = resolve(__dirname, 'output');

  if (!anthropicKey) {
    sendEvent(res, { status: 'error', message: 'ANTHROPIC_API_KEY not set on server' });
    return;
  }

  // Phase 2: Transform + Classify
  sendEvent(res, { status: 'progress', phase: 'transform', message: 'Transforming frame…' });
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

  // Phase 4a: Backend Agent
  let backendFiles = null;
  let interfaceDoc = null;

  if (apiConfig.hasAPIs) {
    sendEvent(res, { status: 'progress', phase: 'backend', message: 'Backend Agent generating services…' });
    const backendPrompt = buildBackendPrompt(classifiedFrames[0].tree, apiConfig);

    if (backendPrompt) {
      try {
        const backendResult = await generateBackend(backendPrompt, anthropicKey);
        backendFiles = backendResult.files;
        interfaceDoc = backendResult.interfaceDoc;
        sendEvent(res, { status: 'progress', phase: 'backend', message: `Backend: ${backendFiles.size} files generated` });
      } catch (err) {
        sendEvent(res, { status: 'progress', phase: 'backend', message: `Backend Agent failed: ${err.message} — continuing` });
      }
    }
  } else {
    sendEvent(res, { status: 'progress', phase: 'backend', message: 'Skipped — no APIs' });
  }

  // Phase 4b: Frontend Agent
  sendEvent(res, { status: 'progress', phase: 'frontend', message: 'Frontend Agent generating UI…' });
  const frontendPrompt = buildFrontendPrompt(
    classifiedFrames[0].tree, tokens, apiConfig,
    interfaceDoc, backendFiles,
  );

  const frontendFiles = await generateFrontend(frontendPrompt, anthropicKey);
  sendEvent(res, { status: 'progress', phase: 'frontend', message: `Frontend: ${frontendFiles.size} files generated` });

  // Phase 5: Write Output
  sendEvent(res, { status: 'progress', phase: 'output', message: 'Writing output files…' });
  const written = await writeOutput(frontendFiles, outputDir, apiConfig, {
    backendFiles,
    interfaceDoc,
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
    interfaceDoc,
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
}

function beginStream(res) {
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleGenerate(req, res) {
  beginStream(res);

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

  try {
    await runPipelineFromFrame(rawFrame, res);
  } catch (err) {
    sendEvent(res, { status: 'error', message: err.message });
  }
  res.end();
}

async function handleGenerateFromHtml(req, res) {
  beginStream(res);

  let htmlString;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    htmlString = Buffer.concat(chunks).toString();
  } catch (err) {
    sendEvent(res, { status: 'error', message: 'Could not read HTML body: ' + err.message });
    res.end();
    return;
  }

  if (!htmlString.trim()) {
    sendEvent(res, { status: 'error', message: 'Empty HTML body' });
    res.end();
    return;
  }

  try {
    sendEvent(res, { status: 'progress', phase: 'convert', message: 'Converting HTML to pipeline format…' });
    const rawFrame = await parseHtmlToFigmaJson(htmlString, process.env.ANTHROPIC_API_KEY);
    sendEvent(res, { status: 'progress', phase: 'convert', message: `Converted: ${countNodes(rawFrame)} nodes, frame "${rawFrame.name}"` });

    await runPipelineFromFrame(rawFrame, res);
  } catch (err) {
    sendEvent(res, { status: 'error', message: err.message });
  }
  res.end();
}

async function handleGenerateFromUrl(req, res) {
  beginStream(res);

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch (err) {
    sendEvent(res, { status: 'error', message: 'Invalid JSON body: ' + err.message });
    res.end();
    return;
  }

  const url = body.url?.trim();
  if (!url) {
    sendEvent(res, { status: 'error', message: 'Missing "url" field in request body' });
    res.end();
    return;
  }

  try {
    sendEvent(res, { status: 'progress', phase: 'fetch', message: `Fetching design from ${url}…` });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    const htmlString = await response.text();
    sendEvent(res, { status: 'progress', phase: 'fetch', message: `Fetched ${(htmlString.length / 1024).toFixed(1)} KB` });

    sendEvent(res, { status: 'progress', phase: 'convert', message: 'Converting HTML to pipeline format…' });
    const rawFrame = await parseHtmlToFigmaJson(htmlString, process.env.ANTHROPIC_API_KEY);
    sendEvent(res, { status: 'progress', phase: 'convert', message: `Converted: ${countNodes(rawFrame)} nodes, frame "${rawFrame.name}"` });

    await runPipelineFromFrame(rawFrame, res);
  } catch (err) {
    sendEvent(res, { status: 'error', message: err.message });
  }
  res.end();
}

async function handleGenerateDesign(req, res) {
  beginStream(res);

  const url = process.env.CLAUDE_DESIGN_URL?.trim();
  if (!url) {
    sendEvent(res, { status: 'error', message: 'CLAUDE_DESIGN_URL not set in .env' });
    res.end();
    return;
  }

  try {
    sendEvent(res, { status: 'progress', phase: 'fetch', message: `Fetching design from CLAUDE_DESIGN_URL…` });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    const htmlString = await response.text();
    sendEvent(res, { status: 'progress', phase: 'fetch', message: `Fetched ${(htmlString.length / 1024).toFixed(1)} KB` });

    sendEvent(res, { status: 'progress', phase: 'convert', message: 'Converting HTML to pipeline format…' });
    const rawFrame = await parseHtmlToFigmaJson(htmlString, process.env.ANTHROPIC_API_KEY);
    sendEvent(res, { status: 'progress', phase: 'convert', message: `Converted: ${countNodes(rawFrame)} nodes, frame "${rawFrame.name}"` });

    await runPipelineFromFrame(rawFrame, res);
  } catch (err) {
    sendEvent(res, { status: 'error', message: err.message });
  }
  res.end();
}

function serveWireframeTool(res) {
  import('fs').then(fs => {
    const htmlPath = resolve(__dirname, 'wireframe-tool', 'index.html');
    try {
      const content = fs.readFileSync(htmlPath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('wireframe-tool/index.html not found');
    }
  });
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

  if (req.method === 'POST' && req.url === '/api/generate-from-html') {
    handleGenerateFromHtml(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate-from-url') {
    handleGenerateFromUrl(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate-design') {
    handleGenerateDesign(req, res);
    return;
  }

  // Serve wireframe-tool static files
  if (req.method === 'GET' && (req.url === '/wireframe-tool' || req.url === '/wireframe-tool/')) {
    serveWireframeTool(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, async () => {
  console.log(`\n  BMW HMI Pipeline Server`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  Endpoints:`);
  console.log(`    POST /api/generate           — Figma plugin (JSON)`);
  console.log(`    POST /api/generate-from-html — Claude Design (HTML upload)`);
  console.log(`    POST /api/generate-from-url  — Claude Design (handoff link)`);
  console.log(`    POST /api/generate-design    — uses CLAUDE_DESIGN_URL from .env`);
  console.log(`    GET  /wireframe-tool          — Upload UI\n`);

  if (process.argv.includes('--run-design')) {
    const filePath = process.env.WIREFRAME_FILE?.trim();
    const url = process.env.CLAUDE_DESIGN_URL?.trim();

    if (!filePath && !url) {
      console.error('  Neither WIREFRAME_FILE nor CLAUDE_DESIGN_URL set in .env');
      return;
    }

    let htmlString;
    try {
      if (filePath) {
        const { readFileSync } = await import('fs');
        const absPath = resolve(__dirname, filePath);
        console.log(`  Reading wireframe from ${absPath}…\n`);
        htmlString = readFileSync(absPath, 'utf-8');
        console.log(`  Read ${(htmlString.length / 1024).toFixed(1)} KB`);
      } else {
        console.log(`  Fetching wireframe from URL…\n`);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
        htmlString = await resp.text();
        console.log(`  Fetched ${(htmlString.length / 1024).toFixed(1)} KB`);
      }

      const rawFrame = await parseHtmlToFigmaJson(htmlString, process.env.ANTHROPIC_API_KEY);
      console.log(`  Converted: ${countNodes(rawFrame)} nodes`);

      const tokensPath = resolve(__dirname, 'tokens', 'tokens.json');
      const outputDir  = resolve(__dirname, 'output');

      const tree = transformFrame(rawFrame);
      const classification = classifyFrame(rawFrame, tree);
      console.log(`  Classified: "${classification.frameName}" → ${classification.frameType}`);

      const apiConfig = resolveAPIs(tree);
      const tokenResult = await applyDesignTokens(tree, tokensPath);
      const tokens = await loadTokens(tokensPath);

      let backendFiles = null, interfaceDoc = null;
      if (apiConfig.hasAPIs) {
        const bp = buildBackendPrompt(tokenResult.tree, apiConfig);
        if (bp) {
          const br = await generateBackend(bp, process.env.ANTHROPIC_API_KEY);
          backendFiles = br.files;
          interfaceDoc = br.interfaceDoc;
          console.log(`  Backend: ${backendFiles.size} files`);
        }
      }

      const fp = buildFrontendPrompt(tokenResult.tree, tokens, apiConfig, interfaceDoc, backendFiles);
      const frontendFiles = await generateFrontend(fp, process.env.ANTHROPIC_API_KEY);
      console.log(`  Frontend: ${frontendFiles.size} files`);

      const written = await writeOutput(frontendFiles, outputDir, apiConfig, { backendFiles, interfaceDoc });
      console.log(`  Wrote ${written.length} files`);

      await new Promise((ok, fail) => {
        const c = spawn('npm', ['install'], { cwd: outputDir, stdio: 'ignore' });
        c.on('close', code => code === 0 ? ok() : fail(new Error('npm install failed')));
        c.on('error', fail);
      });

      const vr = await runValidationLoop(outputDir, {
        apiKey: process.env.ANTHROPIC_API_KEY, maxIterations: 3, tokens, interfaceDoc,
        onProgress: msg => console.log(`  ${msg}`),
      });
      console.log(`  Validation: ${vr.approved ? 'passed' : vr.issues.length + ' issues'}`);

      const previewUrl = await startViteDevServer(outputDir);
      console.log(`\n  Done! Preview: ${previewUrl}\n`);
    } catch (err) {
      console.error(`  Pipeline failed: ${err.message}`);
    }
  }
});

process.on('SIGINT', () => {
  if (viteProcess) viteProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (viteProcess) viteProcess.kill();
  process.exit(0);
});
