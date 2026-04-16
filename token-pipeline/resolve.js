#!/usr/bin/env node
/**
 * Token Resolver
 * ==============
 * Combines multiple token sets into one final tokens.json using
 * priority-based merging with per-category overrides.
 *
 * Two modes:
 *
 *   1. Config mode (default) — reads library.json for sets + rules:
 *        node resolve.js
 *        node resolve.js --config my-library.json
 *
 *   2. Auto-discover mode — reads all .json files in sets/:
 *        node resolve.js --auto
 *        node resolve.js --auto --dir my-sets/
 *
 * Options:
 *   --config   Path to library.json (default: ./library.json)
 *   --auto     Auto-discover sets in a directory instead of using config
 *   --dir      Directory to scan in auto mode (default: ./sets)
 *   --output   Override output path (default: from config or ../fluid-prototype/tokens/tokens.json)
 *   --dry-run  Print merged tokens without writing
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { resolve, dirname, basename }          from 'path';
import { fileURLToPath }                       from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const ok   = (m) => console.log(`\x1b[32m  ✓  ${m}\x1b[0m`);
const fail = (m) => console.error(`\x1b[31m  ✗  ${m}\x1b[0m`);
const warn = (m) => console.warn(`\x1b[33m  ⚠  ${m}\x1b[0m`);
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
// Deep merge (source values overwrite target on conflict)
// ---------------------------------------------------------------------------

function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Token categories the pipeline expects
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'colors', 'spacing', 'typography', 'fontWeights',
  'borderRadius', 'shadows', 'transitions', 'breakpoints',
];

// ---------------------------------------------------------------------------
// Load sets from config or auto-discover
// ---------------------------------------------------------------------------

async function loadSetsFromConfig(configPath) {
  const raw    = await readFile(resolve(configPath), 'utf-8');
  const config = JSON.parse(raw);
  const sets   = [];

  for (const entry of config.sets ?? []) {
    const filePath = resolve(dirname(configPath), entry.path);
    try {
      const tokens = JSON.parse(await readFile(filePath, 'utf-8'));
      sets.push({
        name:        entry.name,
        priority:    entry.priority ?? sets.length + 1,
        description: entry.description ?? '',
        tokens,
      });
    } catch (err) {
      warn(`Skipping "${entry.name}" — ${err.message}`);
    }
  }

  return {
    sets,
    overrides: config.categoryOverrides ?? {},
    output:    config.output ?? null,
  };
}

async function autoDiscoverSets(dir) {
  const absDir = resolve(dir);
  let files;
  try {
    files = await readdir(absDir);
  } catch {
    fail(`Directory not found: ${absDir}`);
    process.exit(1);
  }

  const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
  const sets = [];

  for (let i = 0; i < jsonFiles.length; i++) {
    const filePath = resolve(absDir, jsonFiles[i]);
    try {
      const tokens = JSON.parse(await readFile(filePath, 'utf-8'));
      sets.push({
        name:        basename(jsonFiles[i], '.json'),
        priority:    i + 1,
        description: '',
        tokens,
      });
    } catch (err) {
      warn(`Skipping "${jsonFiles[i]}" — ${err.message}`);
    }
  }

  return { sets, overrides: {}, output: null };
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

function mergeSets(sets, overrides) {
  // Sort: lowest priority number = highest priority (applied last → wins)
  const sorted = [...sets].sort((a, b) => b.priority - a.priority);

  const merged     = {};
  const provenance = {};  // category → set name that contributed
  const conflicts  = [];  // { category, key, values: { setName: value } }

  for (const category of CATEGORIES) {
    // Check for a per-category override
    const preferredName = overrides[category];
    const preferred     = preferredName
      ? sets.find(s => s.name === preferredName)
      : null;

    if (preferred?.tokens[category]) {
      // Use preferred set for this whole category, but fill gaps from others
      let base = {};
      for (const set of sorted) {
        if (set.tokens[category]) {
          base = deepMerge(base, set.tokens[category]);
        }
      }
      merged[category]     = deepMerge(base, preferred.tokens[category]);
      provenance[category] = preferred.name;
    } else {
      // Priority merge: apply lowest-priority first, highest last
      merged[category] = {};
      let winner = null;
      for (const set of sorted) {
        if (set.tokens[category]) {
          merged[category] = deepMerge(merged[category], set.tokens[category]);
          winner = set.name;
        }
      }
      provenance[category] = winner ?? 'default';
    }

    // Detect conflicts (keys where sets disagree)
    detectConflicts(category, sets, conflicts);
  }

  return { merged, provenance, conflicts };
}

function detectConflicts(category, sets, conflicts) {
  const setsWithCategory = sets.filter(s => s.tokens[category]);
  if (setsWithCategory.length < 2) return;

  // Only check flat keys (not deep objects like typography sub-objects)
  const allKeys = new Set();
  for (const set of setsWithCategory) {
    for (const key of Object.keys(set.tokens[category] ?? {})) {
      allKeys.add(key);
    }
  }

  for (const key of allKeys) {
    const values = {};
    for (const set of setsWithCategory) {
      const val = set.tokens[category]?.[key];
      if (val !== undefined) {
        values[set.name] = typeof val === 'object' ? JSON.stringify(val) : val;
      }
    }

    const unique = new Set(Object.values(values));
    if (unique.size > 1) {
      conflicts.push({ category, key, values });
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(sets, provenance, conflicts) {
  console.log('\n── Token Sets ──────────────────────────────────────────────────\n');
  for (const set of sets) {
    const cats = CATEGORIES.filter(c => set.tokens[c]).length;
    console.log(`  [${set.priority}] ${set.name.padEnd(16)} ${cats} categories   ${set.description}`);
  }

  console.log('\n── Category Sources ────────────────────────────────────────────\n');
  for (const cat of CATEGORIES) {
    const source = provenance[cat] ?? 'default';
    console.log(`  ${cat.padEnd(16)} ← ${source}`);
  }

  if (conflicts.length > 0) {
    console.log(`\n── Conflicts (${conflicts.length}) ──────────────────────────────────────────\n`);
    for (const c of conflicts.slice(0, 20)) {
      const vals = Object.entries(c.values)
        .map(([name, val]) => `${name}=${typeof val === 'string' && val.length > 30 ? val.slice(0, 27) + '...' : val}`)
        .join('  vs  ');
      dim(`${c.category}.${c.key}: ${vals}`);
    }
    if (conflicts.length > 20) {
      dim(`... and ${conflicts.length - 20} more`);
    }
  } else {
    console.log('\n  No conflicts — all sets agree.');
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const args = parseArgs(process.argv);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Token Resolver');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Load sets
  let sets, overrides, configOutput;

  if (args.auto) {
    const dir = args.dir ?? resolve(__dirname, 'sets');
    console.log(`\n  Auto-discovering sets in ${dir}\n`);
    ({ sets, overrides, output: configOutput } = await autoDiscoverSets(dir));
  } else {
    const configPath = args.config ?? resolve(__dirname, 'library.json');
    console.log(`\n  Reading config from ${configPath}\n`);
    ({ sets, overrides, output: configOutput } = await loadSetsFromConfig(configPath));
  }

  if (sets.length === 0) {
    fail('No token sets found. Extract some first:');
    console.log('  node pipeline.js --file <KEY> --frame <ID> --output sets/my-set.json\n');
    process.exit(1);
  }

  ok(`Loaded ${sets.length} token set${sets.length > 1 ? 's' : ''}`);

  // Merge
  const { merged, provenance, conflicts } = mergeSets(sets, overrides);

  // Add _meta with provenance
  merged._meta = {
    resolvedAt: new Date().toISOString(),
    sources:    sets.map(s => ({ name: s.name, priority: s.priority })),
    provenance,
    conflictCount: conflicts.length,
  };

  printReport(sets, provenance, conflicts);

  // Output
  const dryRun     = Boolean(args['dry-run']);
  const outputPath = args.output
    ? resolve(args.output)
    : configOutput
      ? resolve(__dirname, configOutput)
      : resolve(__dirname, '..', 'fluid-prototype', 'tokens', 'tokens.json');

  if (dryRun) {
    console.log('── Merged tokens (dry-run) ─────────────────────────────────────\n');
    console.log(JSON.stringify(merged, null, 2));
    console.log('\n────────────────────────────────────────────────────────────────\n');
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
    ok(`Written to ${outputPath}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
