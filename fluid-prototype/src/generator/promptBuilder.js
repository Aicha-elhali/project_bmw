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
 * Collect top-level component names (direct children of root only).
 * Sub-elements should be rendered inline within their parent, not as separate files.
 */
function collectTopLevelComponents(rootNode) {
  const names = [];
  for (const child of rootNode.children ?? []) {
    names.push(toPascalCase(child.label));
  }
  return [...new Set(names)];
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
// Example: a StatusBar component with sub-elements rendered INLINE (not separate files):

import React from 'react';

const StatusBar = ({ style: overrideStyle }) => {
  // Token set: "navi-dark" (colors, spacing)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      backgroundColor: '#262626',
      padding: '0.5rem 1.5rem',
      color: '#FFFFFF',
      fontFamily: '"Inter", Arial, sans-serif',
      ...overrideStyle,
    }}>
      {/* Sub-elements are inline — NOT separate component files */}
      <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>83%</span>
      <span style={{ fontSize: '1rem' }}>11:05</span>
      <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>+21.0 °C</span>
    </div>
  );
};

export default StatusBar;
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
  const componentNames = collectTopLevelComponents(componentTree);
  const setNames = tokenSets.map(s => `"${s.name}"`).join(', ');

  const baseContext = `This is an in-vehicle infotainment display. The UI should feel like a modern automotive dashboard screen — clean, dark-themed, glanceable at speed.`;

  const userBlock = userPrompt
    ? `\n## Scene Description\n\n${baseContext}\n\n**User intent:** ${userPrompt}\n\nUse this to decide what content to show (text, numbers, states) and which token sets fit best.\n`
    : `\n## Scene Description\n\n${baseContext}\n`;

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

Generate one React \`.jsx\` file per **top-level section** of the UI. These are the direct children of the root frame:
${componentNames.map(n => `- ${n}.jsx`).join('\n')}

Plus:
- App.jsx (root component assembling the top-level sections)
- main.jsx (Vite entry point)

**IMPORTANT — Component granularity:**
- Only the top-level sections listed above should be separate \`.jsx\` files.
- Sub-elements (icons, labels, values, shapes, glows) must be rendered INLINE as JSX within their parent component — do NOT create separate files for them.
- Read the \`children\` array in the tree to understand nesting. A child node is part of its parent, not a standalone component.

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

## Critical Visual Rules

11. **Contrast**: NEVER render text or elements that are invisible against their background. If a background is dark → text MUST be light. If background is light → text MUST be dark. Check EVERY element: shapes, icons, and text. If the Figma tree specifies a color that would be invisible (e.g. white rectangle on white background), override it with a visible alternative from the token set.
12. **Deduplication**: The Figma tree contains overlapping layers that represent the SAME visual element (e.g. the same number at different sizes stacked on top of each other, or a container that wraps a single child with identical content). Render each piece of content EXACTLY ONCE — pick the most prominent/meaningful layer and skip the rest.
13. **Dark theme default**: Unless tokens explicitly define a light theme, use dark backgrounds (#1A1A1A or from tokens) with light text (#FFFFFF). Every container, section, and the root App must have an explicit dark backgroundColor set. Do NOT leave any element with a transparent or white background by default.
14. **Skip decorative layers**: Figma layers named "glow", "shadow", "blur", "overlay", "mask", or "background" that are purely decorative effects should be translated to CSS properties (boxShadow, background gradients, opacity) on their parent — not rendered as standalone visible elements.
15. **Sensible content**: Each text element should appear once with a clear purpose. If the tree has identical or near-identical content in sibling nodes, combine them into one element.

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
