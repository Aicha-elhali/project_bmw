/**
 * Fluid Prototype Server
 *
 * Bridges the generic Figma plugin to the BMW iDrive pipeline.
 * Receives serialized frame data via POST, runs phases 2-6,
 * installs deps, starts a Vite dev server, and streams progress
 * back as newline-delimited JSON (NDJSON).
 *
 * Usage:
 *   cd server && npm install && npm start
 *
 * Environment:
 *   ANTHROPIC_API_KEY  — required
 *   PORT               — server port      (default: 3001)
 *   VITE_PORT          — preview port     (default: 5173)
 */

import express       from 'express';
import cors          from 'cors';
import { spawn }     from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';

// ── Pipeline imports (Phase 2-6) ─────────────────────────────────────────────

import { transformFrame }                    from '../fluid-prototype/src/transformer/index.js';
import { applyDesignTokens, loadTokens }     from '../fluid-prototype/src/design/tokenEngine.js';
import { resolveAPIs }                       from '../fluid-prototype/src/generator/apiRegistry.js';
import { buildGenerationPrompt }             from '../fluid-prototype/src/generator/promptBuilder.js';
import { generateComponents }                from '../fluid-prototype/src/generator/claudeClient.js';
import { writeOutput }                       from '../fluid-prototype/src/output/builder.js';
import { runValidationLoop }                 from '../fluid-prototype/src/validator/index.js';

// ── Constants ────────────────────────────────────────────────────────────────

const __dirname    = dirname(fileURLToPath(import.meta.url));
const PORT         = parseInt(process.env.PORT      || '3001', 10);
const VITE_PORT    = parseInt(process.env.VITE_PORT  || '5173', 10);
const TOKENS_PATH  = resolve(__dirname, '..', 'fluid-prototype', 'tokens', 'tokens.json');
const OUTPUT_DIR   = resolve(__dirname, '..', 'fluid-prototype', 'output');

// ── Express setup ────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── State ────────────────────────────────────────────────────────────────────

let viteProcess = null;
let generating  = false;

// ── Helpers ──────────────────────────────────────────────────────────────────

function send(res, data) {
  res.write(JSON.stringify(data) + '\n');
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: 'pipe', shell: true });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}: ${stderr.slice(0, 300)}`));
    });
    proc.on('error', reject);
  });
}

async function restartVite() {
  if (viteProcess) {
    viteProcess.kill('SIGTERM');
    viteProcess = null;
    await new Promise(r => setTimeout(r, 1500));
  }

  return new Promise((resolveP) => {
    const proc = spawn('npx', ['vite', '--port', String(VITE_PORT), '--host'], {
      cwd: OUTPUT_DIR,
      stdio: 'pipe',
      shell: true,
    });

    viteProcess = proc;

    let resolved = false;
    const onData = (chunk) => {
      if (!resolved && chunk.toString().includes('Local:')) {
        resolved = true;
        resolveP();
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('error', (err) => {
      console.error('Vite error:', err.message);
      if (!resolved) { resolved = true; resolveP(); }
    });

    proc.on('close', () => {
      if (viteProcess === proc) viteProcess = null;
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; resolveP(); }
    }, 8000);
  });
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.post('/api/generate', async (req, res) => {
  if (generating) {
    res.status(409).json({ error: 'Generation already in progress' });
    return;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server' });
    return;
  }

  const frameData = req.body;
  if (!frameData || !frameData.id) {
    res.status(400).json({ error: 'Invalid frame data — expected a serialized Figma node tree' });
    return;
  }

  generating = true;

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    // Phase 2: Transform
    send(res, { status: 'progress', phase: 'transform', message: 'Transforming frame...' });
    const componentTree = transformFrame(frameData);

    // Phase 2.5: APIs
    send(res, { status: 'progress', phase: 'apis', message: 'Detecting required APIs...' });
    const apiConfig = resolveAPIs(componentTree);

    // Phase 3: Design tokens
    send(res, { status: 'progress', phase: 'tokens', message: 'Applying design tokens...' });
    const { tree: styledTree, warnings } = await applyDesignTokens(componentTree, TOKENS_PATH);
    if (warnings.length) {
      console.log('Token warnings:', warnings);
    }

    // Phase 4: Claude generation
    send(res, { status: 'progress', phase: 'generate', message: 'Generating code with Claude...' });
    const tokens = await loadTokens(TOKENS_PATH);
    const prompt = buildGenerationPrompt(styledTree, tokens, apiConfig);
    const generatedFiles = await generateComponents(prompt, anthropicKey);

    // Phase 5: Write output
    send(res, { status: 'progress', phase: 'write', message: `Writing ${generatedFiles.size} files...` });
    await writeOutput(generatedFiles, OUTPUT_DIR, apiConfig);

    // Phase 6: Validation loop
    send(res, { status: 'progress', phase: 'validate', message: 'Validating output...' });
    const validationResult = await runValidationLoop(OUTPUT_DIR, {
      apiKey: anthropicKey,
      maxIterations: 3,
      tokens,
      onProgress: (msg) => send(res, { status: 'progress', phase: 'validate', message: msg }),
    });

    if (validationResult.approved) {
      send(res, { status: 'progress', phase: 'validate', message: `Validated after ${validationResult.iterations} iteration(s)` });
    } else {
      send(res, { status: 'progress', phase: 'validate', message: `${validationResult.issues.length} minor issues remaining` });
    }

    // npm install
    send(res, { status: 'progress', phase: 'install', message: 'Installing dependencies...' });
    await runCommand('npm', ['install'], OUTPUT_DIR);

    // Start / restart Vite
    send(res, { status: 'progress', phase: 'vite', message: 'Starting preview server...' });
    await restartVite();

    send(res, { status: 'done', previewUrl: `http://localhost:${VITE_PORT}` });
  } catch (err) {
    console.error('Pipeline error:', err);
    send(res, { status: 'error', message: err.message });
  } finally {
    generating = false;
    res.end();
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    viteRunning: viteProcess !== null,
  });
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nFluid Prototype Server`);
  console.log(`  API:     http://localhost:${PORT}/api/generate`);
  console.log(`  Health:  http://localhost:${PORT}/api/health`);
  console.log(`  Preview: http://localhost:${VITE_PORT} (after first generation)\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('  WARNING: ANTHROPIC_API_KEY is not set!\n');
  }
});

process.on('SIGTERM', () => {
  if (viteProcess) viteProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  if (viteProcess) viteProcess.kill();
  process.exit(0);
});
