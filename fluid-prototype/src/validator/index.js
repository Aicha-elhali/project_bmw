import { readOutputFiles }          from './fileReader.js';
import { runBackendTestingAgent }   from './backendTestingAgent.js';
import { runBackendFixAgent }       from './backendFixAgent.js';
import { runDesignTestingAgent }    from './designTestingAgent.js';
import { runDesignFixAgent }        from './designFixAgent.js';
import { writeFile, mkdir }         from 'fs/promises';
import { join, dirname }            from 'path';

// ---------------------------------------------------------------------------
// Generic validation loop
// ---------------------------------------------------------------------------

async function runLoop(outputDir, { apiKey, maxIterations, tokens, interfaceDoc, onProgress, testFn, fixFn, label }) {
  let prevIssueCount = Infinity;

  for (let i = 0; i < maxIterations; i++) {
    onProgress(`[${label}] Iteration ${i + 1}/${maxIterations}: reading files...`);
    const files = await readOutputFiles(outputDir);
    onProgress(`[${label}] Iteration ${i + 1}/${maxIterations}: testing ${files.size} files...`);

    const verdict = await testFn(files, { apiKey, tokens, interfaceDoc });
    onProgress(`[${label}] Iteration ${i + 1}/${maxIterations}: ${verdict.summary}`);

    if (verdict.approved) {
      onProgress(`[${label}] Approved after ${i + 1} iteration(s)`);
      return { approved: true, iterations: i + 1, issues: verdict.issues };
    }

    const criticals = verdict.issues.filter(x => x.severity === 'critical');
    const toFix = criticals.length > 0 ? criticals : verdict.issues;

    if (toFix.length >= prevIssueCount) {
      onProgress(`[${label}] Issue count not decreasing (${toFix.length} >= ${prevIssueCount}), stopping`);
      return { approved: false, iterations: i + 1, issues: verdict.issues };
    }
    prevIssueCount = toFix.length;

    onProgress(`[${label}] Iteration ${i + 1}/${maxIterations}: fixing ${toFix.length} issues...`);
    const corrected = await fixFn(files, toFix, { apiKey, tokens });

    if (corrected.size === 0) {
      onProgress(`[${label}] Fix agent returned no changes, stopping`);
      return { approved: false, iterations: i + 1, issues: verdict.issues };
    }

    for (const [relPath, code] of corrected) {
      const dest = join(outputDir, relPath);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, code, 'utf-8');
    }

    onProgress(`[${label}] Iteration ${i + 1}/${maxIterations}: wrote ${corrected.size} fixed files`);
  }

  // Final check
  const finalFiles = await readOutputFiles(outputDir);
  const finalVerdict = await testFn(finalFiles, { apiKey, tokens, interfaceDoc });
  onProgress(`[${label}] Final: ${finalVerdict.summary}`);

  return {
    approved: finalVerdict.approved,
    iterations: maxIterations,
    issues: finalVerdict.issues,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run backend validation loop (API calls, hooks, contexts).
 */
export async function runBackendValidationLoop(outputDir, options = {}) {
  const {
    apiKey,
    maxIterations = 2,
    tokens = null,
    interfaceDoc = null,
    onProgress = () => {},
  } = options;

  return runLoop(outputDir, {
    apiKey, maxIterations, tokens, interfaceDoc, onProgress,
    testFn: runBackendTestingAgent,
    fixFn: runBackendFixAgent,
    label: 'Backend',
  });
}

/**
 * Run design validation loop (visual compliance, offscreen, icons, logo).
 */
export async function runDesignValidationLoop(outputDir, options = {}) {
  const {
    apiKey,
    maxIterations = 3,
    tokens = null,
    onProgress = () => {},
  } = options;

  return runLoop(outputDir, {
    apiKey, maxIterations, tokens, interfaceDoc: null, onProgress,
    testFn: runDesignTestingAgent,
    fixFn: runDesignFixAgent,
    label: 'Design',
  });
}

/**
 * Full validation: backend first, then design.
 */
export async function runValidationLoop(outputDir, options = {}) {
  const {
    apiKey,
    maxIterations = 3,
    tokens = null,
    interfaceDoc = null,
    onProgress = () => {},
  } = options;

  // Phase 1: Backend validation (max 2 iterations)
  onProgress('Starting backend validation...');
  const backendResult = await runBackendValidationLoop(outputDir, {
    apiKey,
    maxIterations: Math.min(maxIterations, 2),
    tokens,
    interfaceDoc,
    onProgress,
  });

  // Phase 2: Design validation (max 3 iterations)
  onProgress('Starting design validation...');
  const designResult = await runDesignValidationLoop(outputDir, {
    apiKey,
    maxIterations,
    tokens,
    onProgress,
  });

  return {
    approved: backendResult.approved && designResult.approved,
    iterations: backendResult.iterations + designResult.iterations,
    issues: [...backendResult.issues, ...designResult.issues],
    backendApproved: backendResult.approved,
    designApproved: designResult.approved,
  };
}
