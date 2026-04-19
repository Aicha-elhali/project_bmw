/**
 * Screenshot-based token extraction.
 *
 * Reads PNG screenshots from ../screenshots/, sends each to Claude vision
 * using the same prompt and extraction logic as the Figma pipeline, and
 * writes the resulting token sets to ../sets/.
 *
 * Usage:
 *   node src/screenshot-collector.js                   # process all PNGs
 *   node src/screenshot-collector.js screenshot.png    # process one file
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPromptContent } from './prompt.js';
import { extractTokens } from './claude.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');
const SETS_DIR        = join(__dirname, '..', 'sets');

function stemName(filename) {
  return basename(filename, extname(filename));
}

async function existingSetNames() {
  try {
    const files = await readdir(SETS_DIR);
    return files.filter(f => f.endsWith('.json')).map(f => stemName(f));
  } catch {
    return [];
  }
}

async function processScreenshot(file, apiKey, existingSets) {
  const filePath    = join(SCREENSHOTS_DIR, file);
  const imageBase64 = (await readFile(filePath)).toString('base64');
  const name        = stemName(file);

  const meta = {
    fileKey: 'screenshot',
    frameId: name,
  };

  const emptyCollectedData = {
    frameName:   name,
    frameSize:   null,
    nodeCount:   0,
    solidFills:  [],
    gradients:   [],
    textStyles:  [],
    spacings:    [],
    cornerRadii: [],
    shadows:     [],
    strokes:     [],
  };

  console.log(`\n▸ Processing ${file} …`);

  const content = buildPromptContent(imageBase64, emptyCollectedData, meta, existingSets);
  const tokens  = await extractTokens(content, apiKey);

  await mkdir(SETS_DIR, { recursive: true });
  const outPath = join(SETS_DIR, `${name}.json`);
  await writeFile(outPath, JSON.stringify(tokens, null, 2) + '\n');

  console.log(`  ✓ Saved → sets/${name}.json`);
  return tokens;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    process.exit(1);
  }

  const filterArg = process.argv[2];
  let files;

  if (filterArg) {
    files = [basename(filterArg)];
  } else {
    const all = await readdir(SCREENSHOTS_DIR);
    files = all.filter(f => /\.png$/i.test(f)).sort();
  }

  if (files.length === 0) {
    console.log('No PNG files found in screenshots/.');
    return;
  }

  console.log(`Found ${files.length} screenshot(s) to process.`);

  const existingSets = await existingSetNames();

  for (const file of files) {
    await processScreenshot(file, apiKey, existingSets);
    existingSets.push(stemName(file));
  }

  console.log(`\nDone — ${files.length} token set(s) written.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
