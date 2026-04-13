/**
 * Phase 4a — Prompt Builder
 *
 * Builds the structured prompt that we send to Claude.
 * The prompt contains: component tree (JSON), style map, conventions, and an example.
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
 * Very deep trees would exceed the context limit.
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
// The example component Claude should follow as a template
// ---------------------------------------------------------------------------
const EXAMPLE_COMPONENT = `
// Example of the expected output format (based on bmw.de production CSS):

// Figma element: RECTANGLE "card" → React component: Card
// BMW CSS class reference: similar to .cmp-container with shadow
import React from 'react';

const Card = ({ children, style: overrideStyle }) => {
  // Figma node: RECTANGLE "card" (id: 5:12)
  // BMW production CSS: background #262626, border-radius 0.5rem, shadow-sm
  const style = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#262626',
    borderRadius: '0.5rem',
    boxShadow: '0 0.125rem 0.5rem 0 rgba(0,0,0,0.08), 0 0 0.0625rem 0 rgba(0,0,0,0.24)',
    padding: '1.5rem',
    gap: '1rem',
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '300',
    color: '#FFFFFF',
    overflow: 'hidden',
    transition: 'box-shadow 0.25s ease-in-out',
    ...overrideStyle,
  };
  return <div style={style}>{children}</div>;
};

export default Card;
`.trim();

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a structured prompt for Claude to generate React components.
 * @param {object} componentTree — Phase 3 output (tree with .style applied)
 * @param {object} tokens        — raw tokens object (for inline reference)
 * @returns {string} Full prompt text
 */
export function buildGenerationPrompt(componentTree, tokens) {
  const trimmedTree = trimTree(componentTree);
  const componentNames = [...collectComponentNames(componentTree)];

  return `
You are a senior React engineer working on a BMW digital product. Your task is to generate a complete, working React component library from a Figma wireframe following the BMW Design Language as used on bmw.de.

## BMW Design System (scraped from bmw.de production CSS)

### Colors
- **Background**: #262626 (NOT pure black — this is critical for the BMW look)
- **Text on dark**: #FFFFFF (primary), rgba(255,255,255,0.84) (secondary), rgba(255,255,255,0.75) (muted)
- **BMW Blue**: #1C69D4 (interactive), #0653B6 (hover), #BBD2F3 (light accent), #DDE8F9 (subtle bg)
- **Light surfaces**: #F2F2F2, #F6F6F6
- **Borders**: #E6E6E6 (light), #4D4D4D (dark), never heavy outlines
- **Shadows**: rgba(0,0,0,0.08) light, rgba(0,0,0,0.16) medium
- **Focus ring**: 0 0 0 0.0625rem #FFFFFF, 0 0 0 0.3125rem #1C69D4

### Typography
- **Font**: "bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif
- **Default weight**: 300 (light) — this is THE BMW signature, even for headings
- **Input weight**: 400
- **Clickable/Link weight**: 500
- **Price weight**: 700
- **Headline 1**: 2.0625rem / line-height 2.875rem
- **Headline 2**: 1.75rem / line-height 2.5rem
- **Body**: 1rem / line-height 1.625rem
- **Label**: 0.75rem / weight 500 / line-height 1rem

### Spacing & Layout
- **Border-radius**: 3px (buttons, default), 0.5rem (cards), 0.625rem (large), 50% (circles)
- **Shadows**: \`0 0.125rem 0.5rem 0 rgba(0,0,0,0.08), 0 0 0.0625rem 0 rgba(0,0,0,0.24)\` (card)
- **Transitions**: 0.25s ease-in-out (standard), 0.314s ease-in-out (background-color)
- **Touch targets**: 3rem minimum height
- **Breakpoints**: 768px / 1024px / 1280px / 1920px

### Component Reference (from .cmp-* classes)
- Buttons: .cmp-button — 3px radius, weight 500, min-height 3rem
- Containers: .cmp-container — flex layout, optional fixed margins
- Navigation: .cmp-globalnavigation — dark bg, no border-bottom
- Inputs: underline style (border-bottom only, no full border)

## Input: Component Tree (from Figma)

The following JSON represents a Figma wireframe that has been parsed and enriched with design tokens.
Each node has:
- \`type\`: the component category (button, card, container, text, etc.)
- \`label\`: the original Figma layer name
- \`layout\`: width/height/direction for Flexbox layout
- \`style\`: pre-computed React inline style object (use these values directly)
- \`content\`: text content (for TEXT nodes)
- \`children\`: nested components
- \`meta.figmaType\`: original Figma node type
- \`meta.originalName\`: original Figma layer name

\`\`\`json
${JSON.stringify(trimmedTree, null, 2)}
\`\`\`

## Design Tokens (reference)

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

## Your Task

Generate one React \`.jsx\` file per top-level component. The expected components are:
${componentNames.map(n => `- ${n}.jsx`).join('\n')}

Plus these infrastructure files:
- App.jsx (root component that assembles all components)
- main.jsx (Vite entry point)

## Rules

1. **File format**: Each file starts with a comment: \`// Figma: [figmaType] "[originalName]"\`
2. **Inline styles only**: Use the \`style\` objects from the JSON. No CSS files, no CSS-in-JS libraries, no className.
3. **Flexbox layout**: Interpret Figma coordinates as Flexbox — use \`flexDirection\`, \`gap\`, \`padding\`. Do NOT use \`position: absolute\`.
4. **Props**: Each component accepts a \`children\` prop and a \`style\` prop for overrides (spread at the end of the style object).
5. **ES Modules**: Use \`import/export\`, not CommonJS.
6. **Functional components only**: No class components.
7. **Text content**: If a node has \`content\`, render it as the default text. Otherwise use a placeholder like \`{children}\`.
8. **Nesting**: If a component has children in the tree, render them using \`{children}\`.
9. **No external libraries**: Only React. No framer-motion, no styled-components, no MUI.
10. **Width**: Container components should be \`width: '100%'\`. Leaf components (buttons, badges) can be \`width: 'fit-content'\`.

## Output Format

Return your response as a series of fenced code blocks. Each block must start with a filename comment:

\`\`\`jsx
// FILE: ComponentName.jsx
// Figma: RECTANGLE "card"

import React from 'react';
// ... component code
\`\`\`

## Example

${EXAMPLE_COMPONENT}

Now generate all the components. Start with the smallest leaf components (buttons, text, badges) and work up to containers and App.jsx last.
`.trim();
}
