/**
 * Phase 2 — Figma → Internal Component Representation
 *
 * Maps raw Figma nodes to a simplified, type-safe component tree.
 * The mapping runs on the node NAME first, then falls back to the node TYPE.
 * Add your own name patterns to NAME_PATTERNS to extend the mapping.
 */

// ---------------------------------------------------------------------------
// Name-based mapping table (case-insensitive, partial match)
// Key: regex pattern  →  Value: component type string
// Order matters — first match wins.
// ---------------------------------------------------------------------------
const NAME_PATTERNS = [
  [/btn|button|cta/i,           'button'],
  [/input|field|textfield|search/i, 'input'],
  [/card/i,                     'card'],
  [/nav|navbar|navigation|header/i, 'navbar'],
  [/footer/i,                   'footer'],
  [/sidebar|aside/i,            'sidebar'],
  [/modal|dialog|overlay/i,     'modal'],
  [/image|img|photo|avatar/i,   'image'],
  [/icon/i,                     'icon'],
  [/badge|tag|chip/i,           'badge'],
  [/heading|title|h1|h2|h3/i,   'heading'],
  [/label|caption|hint/i,       'label'],
  [/divider|separator|hr/i,     'divider'],
  [/list/i,                     'list'],
  [/table/i,                    'table'],
  [/form/i,                     'form'],
  [/section|page|screen|frame/i,'container'],
];

// Figma TYPE → component type fallback
const TYPE_FALLBACK = {
  FRAME:         'container',
  GROUP:         'container',
  COMPONENT:     'container',
  COMPONENT_SET: 'container',
  INSTANCE:      'container',
  TEXT:          'text',
  RECTANGLE:     'rectangle',
  VECTOR:        'icon',
  ELLIPSE:       'icon',
  LINE:          'divider',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveType(figmaNode) {
  for (const [pattern, type] of NAME_PATTERNS) {
    if (pattern.test(figmaNode.name)) return type;
  }
  return TYPE_FALLBACK[figmaNode.type] ?? 'unknown';
}

function resolveLayoutDirection(node) {
  if (node.layoutMode === 'HORIZONTAL') return 'row';
  if (node.layoutMode === 'VERTICAL')   return 'column';
  // Guess from bounding box aspect ratio when no auto-layout is set
  const box = node.absoluteBoundingBox;
  if (box && box.width > box.height * 1.5) return 'row';
  return 'column';
}

function extractFill(fills = []) {
  const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false);
  if (!solid) return null;
  const { r, g, b, a = 1 } = solid.color;
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  if (a < 1) return `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a.toFixed(2)})`;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// Core transformer
// ---------------------------------------------------------------------------

let _nodeCounter = 0;

/**
 * Transform a single Figma node into our internal representation.
 * @param {object} figmaNode — already extracted Figma node
 * @param {number} depth     — current tree depth (for debug)
 * @returns {object} Internal component node
 */
export function transformNode(figmaNode, depth = 0) {
  const type = resolveType(figmaNode);
  const box  = figmaNode.absoluteBoundingBox ?? { x: 0, y: 0, width: 0, height: 0 };

  const node = {
    id:    figmaNode.id || `node-${++_nodeCounter}`,
    type,
    label: figmaNode.name,
    // Layout — Figma coordinates + direction hint for Flexbox
    layout: {
      width:     Math.round(box.width)  || null,
      height:    Math.round(box.height) || null,
      x:         Math.round(box.x)      || 0,
      y:         Math.round(box.y)      || 0,
      direction: resolveLayoutDirection(figmaNode),
      gap:       figmaNode.itemSpacing  || 0,
      padding: {
        top:    figmaNode.paddingTop    || 0,
        right:  figmaNode.paddingRight  || 0,
        bottom: figmaNode.paddingBottom || 0,
        left:   figmaNode.paddingLeft   || 0,
      },
    },
    // Extracted visual values (raw — token mapping happens in Phase 3)
    raw: {
      backgroundColor: extractFill(figmaNode.fills),
      borderRadius:    figmaNode.cornerRadius || 0,
      strokeColor:     extractFill(figmaNode.strokes),
      strokeWidth:     figmaNode.strokeWeight || 0,
    },
    // Text content (only for TEXT nodes)
    content: figmaNode.characters ?? null,
    // Typography details
    typography: figmaNode.style ? {
      fontSize:   figmaNode.style.fontSize,
      fontWeight: figmaNode.style.fontWeight,
      fontFamily: figmaNode.style.fontFamily,
      lineHeight: figmaNode.style.lineHeightPx,
      textAlign:  (figmaNode.style.textAlignHorizontal ?? 'LEFT').toLowerCase(),
    } : null,
    // Debug / traceability
    meta: {
      figmaType:    figmaNode.type,
      originalName: figmaNode.name,
      depth,
      componentId:  figmaNode.componentId ?? null,
    },
    children: [],
  };

  // Recurse
  if (figmaNode.children?.length) {
    node.children = figmaNode.children.map(child => transformNode(child, depth + 1));
  }

  return node;
}

/**
 * Transform a complete Figma frame (root node) into an internal component tree.
 * Resets the node counter so IDs are stable per run.
 */
export function transformFrame(figmaFrame) {
  _nodeCounter = 0;
  return transformNode(figmaFrame);
}
