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
  [/\bradio\b|radio.?station|sender|tunein|fm.?\d/i,       'radioPlayer'],
  [/podcast|episode|folge|staffel/i,                      'podcastPlayer'],
  [/media.?player|musik|music|audio|now.?playing|spotify|playlist/i, 'mediaPlayer'],
  [/charg|laden|ladesäule|ladestation|ev.?station|wallbox/i, 'chargingStation'],
  [/wetter|weather|forecast|vorhersage/i,                 'weatherWidget'],
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

function hasNamePattern(name) {
  for (const [pattern] of NAME_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

function resolveLayoutDirection(node) {
  if (node.layoutMode === 'HORIZONTAL') return 'row';
  if (node.layoutMode === 'VERTICAL')   return 'column';
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
// Decorative shape filter
//
// Figma wireframes can include the BMW display shape (chamfered parallelogram)
// as VECTOR/BOOLEAN_OPERATION corner shapes or dark background rectangles.
// These are purely decorative — HMIDisplay handles the display form in code.
// Filter them out so they don't pollute the component tree.
// ---------------------------------------------------------------------------

const DECORATIVE_TYPES = new Set([
  'VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'STAR', 'POLYGON',
]);

function isNearBlack(colorStr) {
  if (!colorStr) return false;
  if (colorStr.startsWith('#')) {
    const r = parseInt(colorStr.slice(1, 3), 16);
    const g = parseInt(colorStr.slice(3, 5), 16);
    const b = parseInt(colorStr.slice(5, 7), 16);
    return r < 25 && g < 25 && b < 25;
  }
  const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return +m[1] < 25 && +m[2] < 25 && +m[3] < 25;
  return false;
}

function isDecorativeShape(figmaNode, depth) {
  if (depth > 2) return false;

  const name = figmaNode.name || '';
  if (hasNamePattern(name)) return false;

  const type = figmaNode.type;

  if (DECORATIVE_TYPES.has(type)) return true;

  if (type === 'ELLIPSE' && !figmaNode.children?.length) return true;

  if (type === 'RECTANGLE' && !figmaNode.children?.length) {
    const fill = extractFill(figmaNode.fills);
    if (isNearBlack(fill)) return true;
  }

  if (type === 'GROUP' && figmaNode.children?.length) {
    if (figmaNode.children.every(c => isDecorativeShape(c, depth + 1))) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Safe-zone constants (HMI Chrome layout boundaries)
// ---------------------------------------------------------------------------

const DISPLAY = { width: 1920, height: 720 };
const SAFE_ZONE = { top: 70, right: 280, bottom: 110, left: 240 };
const CONTENT_WIDTH  = DISPLAY.width  - SAFE_ZONE.left - SAFE_ZONE.right;   // 1400
const CONTENT_HEIGHT = DISPLAY.height - SAFE_ZONE.top  - SAFE_ZONE.bottom;  // 540

// ---------------------------------------------------------------------------
// Blueprint frame preprocessing
//
// The Figma blueprint template has a fixed structure:
//   Root (1400×540) → Formatbackground (decorative) + Ui Canvas (design area)
// Flatten: remove Formatbackground, promote Ui Canvas's children to root.
// ---------------------------------------------------------------------------

function preprocessBlueprint(figmaFrame) {
  const children = figmaFrame.children ?? [];
  if (children.length < 2) return figmaFrame;

  const bgLayer = children.find(c => /format.?background/i.test(c.name));
  const uiCanvas = children.find(c => /ui.?canvas/i.test(c.name));

  if (!bgLayer || !uiCanvas) return figmaFrame;

  process.stderr.write('  [blueprint] Detected blueprint frame — flattening Ui Canvas, removing Formatbackground\n');
  return { ...figmaFrame, children: uiCanvas.children ?? [] };
}

// ---------------------------------------------------------------------------
// Core transformer
// ---------------------------------------------------------------------------

let _nodeCounter = 0;
let _rootBox = null;

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

  if (_rootBox && _rootBox.width > 0 && _rootBox.height > 0) {
    const relX = (box.x - _rootBox.x) / _rootBox.width;
    const relY = (box.y - _rootBox.y) / _rootBox.height;
    const relW = box.width  / _rootBox.width;
    const relH = box.height / _rootBox.height;

    node.relativeLayout = {
      xPercent:      +(relX * 100).toFixed(1),
      yPercent:      +(relY * 100).toFixed(1),
      widthPercent:  +(relW * 100).toFixed(1),
      heightPercent: +(relH * 100).toFixed(1),
    };

    node.safeZoneHint = {
      left:   Math.round(box.x - _rootBox.x),
      top:    Math.round(box.y - _rootBox.y),
      width:  Math.round(box.width),
      height: Math.round(box.height),
    };
  }

  if (figmaNode.children?.length) {
    const before = figmaNode.children.length;
    const filtered = figmaNode.children.filter(child => !isDecorativeShape(child, depth + 1));
    if (depth === 0) {
      _filteredCount += before - filtered.length;
    }
    node.children = filtered.map(child => transformNode(child, depth + 1));
  }

  return node;
}

let _filteredCount = 0;

/**
 * Transform a complete Figma frame into a navigation component tree.
 * Resets the node counter so IDs are stable per run.
 *
 * @returns {object} tree — root node with `.hasDisplayShape` flag
 */
export function transformFrame(figmaFrame) {
  _nodeCounter = 0;
  _filteredCount = 0;
  figmaFrame = preprocessBlueprint(figmaFrame);
  _rootBox = figmaFrame.absoluteBoundingBox ?? { x: 0, y: 0, width: 1920, height: 720 };
  const tree = transformNode(figmaFrame);
  tree.hasDisplayShape = _filteredCount > 0;

  const fw = Math.round(_rootBox.width);
  const fh = Math.round(_rootBox.height);
  tree.contentBounds = {
    left:   0,
    top:    0,
    width:  fw,
    height: fh,
  };

  _rootBox = null;
  return tree;
}
