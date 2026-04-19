/**
 * Full screenshot-to-HTML pipeline.
 *
 * 1. PNG screenshot  →  design tokens JSON  (Claude vision extracts tokens)
 * 2. tokens JSON     →  CSS variables       (automatic conversion)
 * 3. PNG + CSS       →  HTML file           (Claude vision replicates the UI)
 *
 * Usage:
 *   node src/generate-html.js screenshots/bmw_idrive_navigation.png
 *   node src/generate-html.js screenshots/bmw_idrive_navigation.png --out public/navigation.html
 */

import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

import { buildPromptContent } from './prompt.js';
import { extractTokens } from './claude.js';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const SETS_DIR     = join(__dirname, '..', 'sets');
const DEFAULT_OUT  = join(__dirname, '..', '..', 'fluid-prototype', 'public');

const MODEL      = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';
const MAX_TOKENS = 16384;

// ─── Step 1: Extract tokens from screenshot ──────────────────────────────────

async function extractTokensFromScreenshot(screenshotPath, name, apiKey) {
  const imageBase64 = (await readFile(screenshotPath)).toString('base64');

  const meta = { fileKey: 'screenshot', frameId: name };

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

  let existingSets = [];
  try {
    const files = await readdir(SETS_DIR);
    existingSets = files.filter(f => f.endsWith('.json')).map(f => basename(f, '.json'));
  } catch { /* empty */ }

  const content = buildPromptContent(imageBase64, emptyCollectedData, meta, existingSets);
  return extractTokens(content, apiKey);
}

// ─── Step 2: Convert tokens JSON → CSS variables ────────────────────────────

function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function tokensToCSSVariables(tokens) {
  const lines = [':root {'];

  for (const [section, values] of Object.entries(tokens)) {
    if (section === '_meta') continue;

    lines.push(`\n  /* ${section.charAt(0).toUpperCase() + section.slice(1)} */`);

    if (typeof values === 'object' && !Array.isArray(values)) {
      for (const [key, val] of Object.entries(values)) {
        if (typeof val === 'object') {
          for (const [prop, v] of Object.entries(val)) {
            const varName = `--${camelToKebab(section)}-${camelToKebab(key)}-${camelToKebab(prop)}`;
            lines.push(`  ${varName}: ${v};`);
          }
        } else {
          const prefix = {
            colors: 'color',
            spacing: 'spacing',
            fontWeights: 'font-weight',
            borderRadius: 'radius',
            shadows: 'shadow',
            transitions: 'transition',
            breakpoints: 'breakpoint',
          }[section] ?? camelToKebab(section);
          const varName = `--${prefix}-${camelToKebab(key)}`;
          lines.push(`  ${varName}: ${val};`);
        }
      }
    }
  }

  lines.push('}');
  return lines.join('\n');
}

// ─── Step 3: Generate HTML from screenshot + CSS tokens ─────────────────────

const SYSTEM_PROMPT = `You are a pixel-perfect UI replicator. You receive a screenshot of a BMW iDrive car interface and a set of CSS design tokens extracted FROM THAT SAME screenshot. Your ONLY job is to reproduce EXACTLY what you see in the screenshot as a single HTML file, using those tokens.

ABSOLUTE RULES — violating any of these is a failure:

1. COPY, NEVER INVENT. Every element in your output must be visible in the screenshot. If you cannot see it, do not add it.

2. FLAT SCREEN — NO 3D. The output is a flat 2D UI. NEVER add perspective(), rotateX(), rotateY(), skewY() or any 3D CSS transforms to the screen container. The screenshot is taken at an angle but the UI itself is flat.

3. PARALLELOGRAM CARDS — THIS IS CRITICAL. In BMW iDrive, cards and panels are NOT rectangles. They are parallelogram/skewed shapes with angled left and right edges. You MUST implement this using:
   - clip-path: polygon(20px 0, 100% 0, calc(100% - 20px) 100%, 0 100%) on card containers, OR
   - transform: skewX(-5deg) on the card with transform: skewX(5deg) on inner content to keep text straight.
   The skew is subtle (~5 degrees) but clearly visible. Look at every card, tile, and panel — their left edge slants right and their right edge slants left. If you render them as plain rectangles, you have FAILED.

4. EXACT LAYOUT PROPORTIONS from the screenshot:
   - Narrow icon sidebar on the far left: ~60px wide
   - Left content panel (cards + connect): ~40% of remaining width
   - Map area: ~60% of remaining width
   - Top status bar: ~36px tall
   - Bottom control bar: ~48px tall, spans full width
   - The blue vertical accent line separates sidebar from content panel

5. EXACT COLORS. Use ONLY the CSS variables from the provided tokens. Never invent new hex or rgba values.

6. EXACT TEXT. Reproduce only the text visible in the screenshot. Do not add labels, tooltips, or placeholder text.

7. NO EXTRA ELEMENTS. No hover effects, animations, transitions, or interactive states.

8. SINGLE FILE. Output one complete HTML file with CSS variables in a <style> tag, then all styles using var(--...) references.

9. ICONS — use ONLY simple inline SVG shapes. NEVER use emojis or Unicode symbols. If you cannot draw an icon as SVG, leave it out entirely.

10. BOTTOM BAR LAYOUT: Left side has AC controls (OFF/temperature), center has a row of small icons (music, navigation, turn, grid, fan, car, dots), right side has AC controls. All separated by thin vertical dividers.

OUTPUT FORMAT: Return ONLY the HTML code inside a single code block. No explanation, no commentary.`;

function buildHTMLPrompt(tokensCSS) {
  return `These design tokens were extracted from the screenshot you are about to see. Use them as CSS variables for ALL styling:

\`\`\`css
${tokensCSS}
\`\`\`

Now look at the attached screenshot. Reproduce it as a single HTML file.

Before writing code, mentally catalogue every element you see:
- What is the overall layout structure?
- What shapes are the panels/cards? (rectangular, rounded, skewed/trapezoid?)
- What text is visible and where?
- What icons/symbols are present?
- What are the proportions of each area?

Then write HTML+CSS that replicates the screenshot 1:1. Use ONLY the CSS variables above for styling values.`;
}

async function generateHTML(screenshotPath, tokensCSS, apiKey) {
  const imageBase64 = (await readFile(screenshotPath)).toString('base64');
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: imageBase64 },
          },
          {
            type: 'text',
            text: buildHTMLPrompt(tokensCSS),
          },
        ],
      },
    ],
  });

  const raw = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  const htmlMatch = raw.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (!htmlMatch) {
    throw new Error(
      'Claude did not return an HTML code block.\n' +
      `Raw response (first 500 chars):\n${raw.slice(0, 500)}`
    );
  }

  return htmlMatch[1].trim();
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function stemName(filename) {
  return basename(filename, extname(filename));
}

function parseArgs(argv) {
  const args = { screenshot: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      args.out = argv[++i];
    } else if (!argv[i].startsWith('--')) {
      args.screenshot = argv[i];
    }
  }
  return args;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    process.exit(1);
  }

  const args = parseArgs(process.argv);
  if (!args.screenshot) {
    console.error('Usage: node src/generate-html.js <screenshot.png> [--out path/to/output.html]');
    process.exit(1);
  }

  const screenshotPath = args.screenshot;
  const name = stemName(screenshotPath);

  const outPath = args.out ?? join(DEFAULT_OUT, `${name}.html`);

  const forceTokens = process.argv.includes('--new-tokens');

  console.log(`\n━━━ Screenshot → Tokens → HTML Pipeline ━━━\n`);
  console.log(`▸ Screenshot: ${screenshotPath}`);
  console.log(`▸ Output:     ${outPath}\n`);

  await mkdir(SETS_DIR, { recursive: true });
  const jsonPath = join(SETS_DIR, `${name}.json`);
  const cssPath  = join(SETS_DIR, `${name}.css`);

  let tokensCSS;
  const tokensExist = await access(jsonPath).then(() => true).catch(() => false);

  if (tokensExist && !forceTokens) {
    // Reuse existing tokens
    console.log(`[Step 1/3] Tokens already exist → sets/${name}.json (skipped)`);
    const tokens = JSON.parse(await readFile(jsonPath, 'utf-8'));
    tokensCSS = tokensToCSSVariables(tokens);
    console.log(`[Step 2/3] CSS variables regenerated from existing tokens`);
  } else {
    // Extract fresh tokens
    console.log(`[Step 1/3] Extracting design tokens from screenshot…`);
    const tokens = await extractTokensFromScreenshot(screenshotPath, name, apiKey);
    await writeFile(jsonPath, JSON.stringify(tokens, null, 2) + '\n');
    console.log(`  ✓ Tokens → sets/${name}.json`);

    console.log(`[Step 2/3] Converting tokens to CSS variables…`);
    tokensCSS = tokensToCSSVariables(tokens);
    await writeFile(cssPath, tokensCSS + '\n');
    console.log(`  ✓ CSS    → sets/${name}.css`);
  }

  // Step 3: Generate HTML
  console.log(`[Step 3/3] Generating HTML from screenshot + tokens…`);
  const html = await generateHTML(screenshotPath, tokensCSS, apiKey);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html + '\n');
  console.log(`  ✓ HTML   → ${outPath}`);

  console.log(`\n━━━ Done! ━━━`);
  console.log(`  open ${outPath}\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
