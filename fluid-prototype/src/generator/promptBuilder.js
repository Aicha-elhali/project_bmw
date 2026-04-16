/**
 * Phase 4a — Prompt Builder
 *
 * Builds the structured prompt that we send to Claude.
 *
 * Key capability: receives ALL available token sets and instructs Claude
 * to choose the right set per component / area. Different parts of the
 * page can use different token sets (e.g. navbar → brand tokens,
 * map overlay → navigation-dark tokens, popup → alert tokens).
 */

/**
 * Collect all unique component types from the tree.
 */
function collectComponentNames(node, names = new Set()) {
  names.add(toPascalCase(node.label));
  for (const child of node.children ?? []) collectComponentNames(child, names);
  return names;
}

function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/**
 * Trim the component tree to a prompt-safe depth.
 */
function trimTree(node, maxDepth = 5, depth = 0) {
  const trimmed = { ...node, children: [] };
  if (depth < maxDepth && node.children?.length) {
    trimmed.children = node.children.map(c => trimTree(c, maxDepth, depth + 1));
  } else if (node.children?.length) {
    trimmed._truncated = `${node.children.length} children omitted`;
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Example component
// ---------------------------------------------------------------------------

const EXAMPLE_COMPONENT = `
// Example of the expected output format:

import React from 'react';

const Card = ({ children, style: overrideStyle }) => {
  // Uses "brand" token set — this is a brand-level container
  const style = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#262626',       // brand → colors.background
    borderRadius: '0.5rem',           // brand → borderRadius.md
    boxShadow: '0 0.125rem 0.5rem 0 rgba(0,0,0,0.08)',
    padding: '1.5rem',                // brand → spacing.lg
    gap: '1rem',
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '300',
    color: '#FFFFFF',
    overflow: 'hidden',
    transition: '0.25s ease-in-out',
    ...overrideStyle,
  };
  return <div style={style}>{children}</div>;
};

export default Card;
`.trim();

// ---------------------------------------------------------------------------
// Build the token sets section of the prompt
// ---------------------------------------------------------------------------

function buildTokenSetsBlock(tokenSets) {
  if (tokenSets.length === 0) return '(no token sets available — use sensible defaults)\n';

  return tokenSets.map(set => {
    const meta = set.tokens._meta ?? {};
    const desc = meta.description ?? '';
    const theme = meta.theme ?? '';
    const heading = `### Set: "${set.name}"${desc ? ` — ${desc}` : ''}${theme ? ` [${theme} theme]` : ''}`;

    // Remove _meta from the tokens we send to keep it clean
    const { _meta, ...tokenValues } = set.tokens;
    return `${heading}\n\n\`\`\`json\n${JSON.stringify(tokenValues, null, 2)}\n\`\`\``;
  }).join('\n\n');
}

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a structured prompt for Claude to generate React components.
 *
 * @param {object}   componentTree — Phase 2 output (tree with layout info)
 * @param {Array}    tokenSets     — Array of { name, tokens } from sets/
 * @param {string}   userPrompt    — User description of what the UI should show
 * @returns {string} Full prompt text
 */
export function buildGenerationPrompt(componentTree, tokenSets, userPrompt = '') {
  const trimmedTree = trimTree(componentTree);
  const componentNames = [...collectComponentNames(componentTree)];
  const setNames = tokenSets.map(s => `"${s.name}"`).join(', ');

  const userBlock = userPrompt
    ? `\n## Scene Description (from the user)\n\n${userPrompt}\n\nUse this to decide what content to show (text, numbers, states) and which token sets fit best.\n`
    : '';

  return `
You are a senior React engineer. Your task is to generate a complete React component library from a Figma wireframe.
${userBlock}
## Available Token Sets

You have ${tokenSets.length} design token set${tokenSets.length !== 1 ? 's' : ''} available: ${setNames}.
Each set represents a different UI context (brand, screen type, feature, etc.).

**You MUST choose the most appropriate token set for each component / area.**
Different parts of the page can — and should — use different sets when they represent different contexts.

${buildTokenSetsBlock(tokenSets)}

## Token Selection Rules

1. **Read the set descriptions** — they tell you what each set is for.
2. **Match by context**: a navigation overlay → use navigation tokens. A brand header → brand tokens. A popup or alert → use whichever set fits that UI pattern.
3. **Mix freely**: one component can use "brand" colors while its child uses "navi-dark" spacing. Pick the best fit per property when sets overlap.
4. **Add a comment** at the top of each component saying which set(s) it uses:
   \`// Token set: "brand" (colors, typography) + "navi-dark" (spacing)\`
5. **Fallback**: if no set clearly matches, pick the one whose theme/mood is closest.

## Input: Component Tree (from Figma)

Each node has:
- \`type\`: component category (button, card, container, text, etc.)
- \`label\`: original Figma layer name
- \`layout\`: width/height/direction for Flexbox
- \`content\`: text content (for TEXT nodes)
- \`children\`: nested components
- \`raw\`: original Figma visual properties (fills, strokes, radius)
- \`meta.figmaType\`: original Figma node type

\`\`\`json
${JSON.stringify(trimmedTree, null, 2)}
\`\`\`

## Your Task

Generate one React \`.jsx\` file per top-level component. Expected:
${componentNames.map(n => `- ${n}.jsx`).join('\n')}

Plus:
- App.jsx (root component assembling everything)
- main.jsx (Vite entry point)

## Rules

1. **File format**: Each file starts with \`// FILE: ComponentName.jsx\`
2. **Token set comment**: Second line: \`// Token set: "set-name"\`
3. **Inline styles only**: Use token values as inline React style objects. No CSS files, no className.
4. **Flexbox layout**: Use flexDirection, gap, padding. No position: absolute.
5. **Props**: Each component accepts \`children\` and \`style\` props (spread at end).
6. **ES Modules**: import/export, not CommonJS.
7. **Functional components only**.
8. **Text content**: Render \`content\` from the tree, or use \`{children}\`.
9. **No external libraries**: Only React.
10. **Width**: Containers → \`width: '100%'\`. Leaf nodes → \`width: 'fit-content'\`.

## Output Format

\`\`\`jsx
// FILE: ComponentName.jsx
// Token set: "brand" (colors) + "navi-dark" (spacing, shadows)

import React from 'react';
// ... component code
\`\`\`

## Example

${EXAMPLE_COMPONENT}

Now generate all components. Start with leaf components, work up to containers, then App.jsx last.
`.trim();
}
