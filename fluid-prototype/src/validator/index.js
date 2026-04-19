import { readOutputFiles } from './fileReader.js';
import { runTestingAgent } from './testingAgent.js';
import { runFixAgent }     from './fixAgent.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname }    from 'path';

/**
 * Validation loop: testing agent checks output, fix agent repairs issues.
 *
 * @param {string}   outputDir
 * @param {object}   options
 * @param {string}   options.apiKey
 * @param {number}   [options.maxIterations=3]
 * @param {object}   [options.tokens]
 * @param {function} [options.onProgress]
 * @returns {Promise<{ approved: boolean, iterations: number, issues: object[] }>}
 */
export async function runValidationLoop(outputDir, options = {}) {
  const {
    apiKey,
    maxIterations = 3,
    tokens = null,
    onProgress = () => {},
  } = options;

  let prevIssueCount = Infinity;

  for (let i = 0; i < maxIterations; i++) {
    onProgress(`Iteration ${i + 1}/${maxIterations}: reading output files...`);
    const files = await readOutputFiles(outputDir);
    onProgress(`Iteration ${i + 1}/${maxIterations}: testing agent reviewing ${files.size} files...`);

    const verdict = await runTestingAgent(files, { apiKey, tokens });
    onProgress(`Iteration ${i + 1}/${maxIterations}: ${verdict.summary}`);

    if (verdict.approved) {
      onProgress(`Approved after ${i + 1} iteration(s)`);
      return { approved: true, iterations: i + 1, issues: verdict.issues };
    }

    const criticals = verdict.issues.filter(x => x.severity === 'critical');
    const toFix = criticals.length > 0 ? criticals : verdict.issues;

    // Bail if issue count is not decreasing (stuck loop)
    if (toFix.length >= prevIssueCount) {
      onProgress(`Issue count not decreasing (${toFix.length} >= ${prevIssueCount}), stopping`);
      return { approved: false, iterations: i + 1, issues: verdict.issues };
    }
    prevIssueCount = toFix.length;

    onProgress(`Iteration ${i + 1}/${maxIterations}: fix agent repairing ${toFix.length} issues...`);
    const corrected = await runFixAgent(files, toFix, { apiKey, tokens });

    if (corrected.size === 0) {
      onProgress('Fix agent returned no changes, stopping');
      return { approved: false, iterations: i + 1, issues: verdict.issues };
    }

    for (const [relPath, code] of corrected) {
      const dest = join(outputDir, relPath);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, code, 'utf-8');
    }

    onProgress(`Iteration ${i + 1}/${maxIterations}: wrote ${corrected.size} fixed files, re-validating...`);
  }

  // Final check after last fix
  const finalFiles = await readOutputFiles(outputDir);
  const finalVerdict = await runTestingAgent(finalFiles, { apiKey, tokens });
  onProgress(`Final verdict: ${finalVerdict.summary}`);

  return {
    approved: finalVerdict.approved,
    iterations: maxIterations,
    issues: finalVerdict.issues,
  };
}
