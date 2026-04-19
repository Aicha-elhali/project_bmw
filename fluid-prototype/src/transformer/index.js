/**
 * Phase 2 — Figma → Navigation Component Tree
 *
 * Maps raw Figma nodes to BMW iDrive navigation component types
 * based on layer names. The mapping runs on the node NAME first
 * (case-insensitive partial match), then falls back to the Figma TYPE.
 *
 * Layer-naming convention for Figma wireframes:
 *   Include keywords like "map", "dock", "route", "statusBar", "climate"
 *   in your Figma layer names so the pipeline picks the right component type.
 */

// ---------------------------------------------------------------------------
// Name-based mapping table (case-insensitive, partial match)
// Order matters — first match wins.
// ---------------------------------------------------------------------------
const NAME_PATTERNS = [
  // ── Navigation-specific ─────────────────────────────────────────────────
  [/status.?bar|top.?bar/i,                              'statusBar'],
  [/map|karte|map.?view|map.?area/i,                     'map'],
  [/route.?info|route.?panel|route.?detail|eta|ankunft/i, 'routeInfo'],
  [/turn.?indicator|turn.?by.?turn|abbieg|richtung|maneuver/i, 'turnIndicator'],
  [/search.?bar|search.?field|such|address.?input/i,     'searchBar'],
  [/dock.?item|tab.?item|nav.?item|menu.?item/i,         'dockItem'],
  [/dock|tab.?bar|bottom.?nav|menu.?bar|app.?bar/i,      'dock'],
  [/side.?panel|drawer|detail.?panel/i,                   'sidePanel'],
  [/media.?player|musik|music|radio|audio|now.?playing/i, 'mediaPlayer'],
  [/climate|klima|temperature|temp.?control|ac.?control/i,'climateControl'],
  [/quick.?action|fab|float.?button|map.?action/i,       'quickAction'],
  [/poi.?list|result.?list|ergebnis/i,                    'poiList'],
  [/poi.?item|poi.?entry|result.?item/i,                  'poiItem'],
  [/speed.?limit|tempo.?limit|geschwindigkeit/i,          'speedLimit'],
  [/vehicle.?info|fahrzeug|range|reichweite|fuel|tank|battery|akku/i, 'vehicleInfo'],

  // ── Generic UI elements ─────────────────────────────────────────────────
  [/icon.?btn|icon.?button/i,                             'iconButton'],
  [/btn|button|cta/i,                                     'button'],
  [/input|field|textfield/i,                              'searchBar'],
  [/card|tile|widget/i,                                   'card'],
  [/nav|navbar|navigation|header/i,                       'statusBar'],
  [/toggle|switch/i,                                      'toggle'],
  [/slider|range/i,                                       'slider'],
  [/heading|title|h1|h2|h3/i,                             'heading'],
  [/label|caption|hint|subtitle/i,                        'text'],
  [/divider|separator|hr/i,                               'divider'],
  [/image|img|photo|bild|avatar/i,                        'image'],
  [/icon/i,                                               'icon'],
  [/badge|tag|chip/i,                                     'text'],
  [/list/i,                                               'poiList'],
  [/section|page|screen|frame|container|group/i,          'container'],
];

// Figma TYPE → component type fallback
const TYPE_FALLBACK = {
  FRAME:         'container',
  GROUP:         'container',
  COMPONENT:     'container',
  COMPONENT_SET: 'container',
  INSTANCE:      'container',
  TEXT:          'text',
  RECTANGLE:     'container',
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
  return TYPE_FALLBACK[figmaNode.type] ?? 'container';
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
 * Transform a single Figma node into an internal navigation component.
 * @param {object} figmaNode — already extracted Figma node
 * @param {number} depth     — current tree depth
 * @returns {object} Internal component node
 */
export function transformNode(figmaNode, depth = 0) {
  const type = resolveType(figmaNode);
  const box  = figmaNode.absoluteBoundingBox ?? { x: 0, y: 0, width: 0, height: 0 };

  const node = {
    id:    figmaNode.id || `node-${++_nodeCounter}`,
    type,
    label: figmaNode.name,
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
    raw: {
      backgroundColor: extractFill(figmaNode.fills),
      borderRadius:    figmaNode.cornerRadius || 0,
      strokeColor:     extractFill(figmaNode.strokes),
      strokeWidth:     figmaNode.strokeWeight || 0,
    },
    content: figmaNode.characters ?? null,
    typography: figmaNode.style ? {
      fontSize:   figmaNode.style.fontSize,
      fontWeight: figmaNode.style.fontWeight,
      fontFamily: figmaNode.style.fontFamily,
      lineHeight: figmaNode.style.lineHeightPx,
      textAlign:  (figmaNode.style.textAlignHorizontal ?? 'LEFT').toLowerCase(),
    } : null,
    meta: {
      figmaType:    figmaNode.type,
      originalName: figmaNode.name,
      depth,
      componentId:  figmaNode.componentId ?? null,
    },
    children: [],
  };

  if (figmaNode.children?.length) {
    node.children = figmaNode.children.map(child => transformNode(child, depth + 1));
  }

  return node;
}

/**
 * Transform a complete Figma frame into a navigation component tree.
 * Resets the node counter so IDs are stable per run.
 */
export function transformFrame(figmaFrame) {
  _nodeCounter = 0;
  return transformNode(figmaFrame);
}
