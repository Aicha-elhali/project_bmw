/**
 * Fluid Prototype — Figma Plugin (Sandbox Code)
 *
 * Generic frame serializer. Reads the selected Figma frame and converts it
 * into a portable JSON tree that any backend pipeline can consume.
 * No pipeline-specific logic lives here.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function styleNameToWeight(styleName) {
  if (!styleName) return 400;
  const s = styleName.toLowerCase();
  if (s.includes('thin'))                                   return 100;
  if (s.includes('extralight') || s.includes('ultralight')) return 200;
  if (s.includes('light'))                                  return 300;
  if (s.includes('medium'))                                 return 500;
  if (s.includes('semibold') || s.includes('demibold'))     return 600;
  if (s.includes('extrabold') || s.includes('ultrabold'))   return 800;
  if (s.includes('bold'))                                   return 700;
  if (s.includes('black') || s.includes('heavy'))           return 900;
  return 400;
}

function safeFills(node) {
  if (!('fills' in node) || !node.fills) return [];
  try {
    const raw = node.fills;
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const f = raw[i];
      const entry = { type: f.type, visible: f.visible !== false };
      if (f.type === 'SOLID' && f.color) {
        entry.color = { r: f.color.r, g: f.color.g, b: f.color.b };
        entry.opacity = f.opacity != null ? f.opacity : 1;
      }
      out.push(entry);
    }
    return out;
  } catch (e) { return []; }
}

function safeStrokes(node) {
  if (!('strokes' in node) || !node.strokes) return [];
  try {
    const raw = node.strokes;
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const s = raw[i];
      const entry = { type: s.type, visible: s.visible !== false };
      if (s.type === 'SOLID' && s.color) {
        entry.color = { r: s.color.r, g: s.color.g, b: s.color.b };
        entry.opacity = s.opacity != null ? s.opacity : 1;
      }
      out.push(entry);
    }
    return out;
  } catch (e) { return []; }
}

function safeNumber(val, fallback) {
  return typeof val === 'number' ? val : fallback;
}

function getTextStyle(node) {
  let fontSize = node.fontSize;
  if (typeof fontSize !== 'number') {
    try { fontSize = node.getRangeFontSize(0, 1); } catch (e) { fontSize = 16; }
  }

  let fontName = node.fontName;
  if (!fontName || typeof fontName !== 'object' || !fontName.family) {
    try { fontName = node.getRangeFontName(0, 1); } catch (e) { fontName = { family: 'Arial', style: 'Regular' }; }
  }

  let lineHeightPx = fontSize * 1.2;
  try {
    const lh = node.lineHeight;
    if (lh && typeof lh === 'object') {
      if (lh.unit === 'PIXELS')  lineHeightPx = lh.value;
      if (lh.unit === 'PERCENT') lineHeightPx = fontSize * (lh.value / 100);
    }
  } catch (e) {}

  return {
    fontSize,
    fontWeight:           styleNameToWeight(fontName.style),
    fontFamily:           fontName.family || 'Arial',
    lineHeightPx,
    textAlignHorizontal:  node.textAlignHorizontal || 'LEFT',
  };
}

// ── Serializer ───────────────────────────────────────────────────────────────

function serializeNode(node) {
  if (node.visible === false) return null;

  let absoluteBoundingBox = null;
  try {
    if ('absoluteTransform' in node) {
      const t = node.absoluteTransform;
      absoluteBoundingBox = {
        x:      t[0][2],
        y:      t[1][2],
        width:  node.width,
        height: node.height,
      };
    }
  } catch (e) {}

  const serialized = {
    id:                     node.id,
    name:                   node.name,
    type:                   node.type,
    absoluteBoundingBox,
    size:                   { width: node.width, height: node.height },
    fills:                  safeFills(node),
    strokes:                safeStrokes(node),
    strokeWeight:           safeNumber('strokeWeight' in node ? node.strokeWeight : 0, 0),
    cornerRadius:           safeNumber('cornerRadius' in node ? node.cornerRadius : 0, 0),
    layoutMode:             ('layoutMode' in node)             ? node.layoutMode             : null,
    primaryAxisAlignItems:  ('primaryAxisAlignItems' in node)  ? node.primaryAxisAlignItems  : null,
    counterAxisAlignItems:  ('counterAxisAlignItems' in node)  ? node.counterAxisAlignItems  : null,
    itemSpacing:            safeNumber('itemSpacing' in node ? node.itemSpacing : 0, 0),
    paddingLeft:            safeNumber('paddingLeft' in node   ? node.paddingLeft   : 0, 0),
    paddingRight:           safeNumber('paddingRight' in node  ? node.paddingRight  : 0, 0),
    paddingTop:             safeNumber('paddingTop' in node    ? node.paddingTop    : 0, 0),
    paddingBottom:          safeNumber('paddingBottom' in node ? node.paddingBottom : 0, 0),
    characters:             node.type === 'TEXT' ? node.characters : null,
    style:                  node.type === 'TEXT' ? getTextStyle(node) : null,
    componentId:            ('componentId' in node) ? node.componentId : null,
    visible:                true,
    children:               [],
  };

  if ('children' in node && node.children) {
    for (const child of node.children) {
      const s = serializeNode(child);
      if (s) serialized.children.push(s);
    }
  }

  return serialized;
}

// ── Message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = (msg) => {
  console.log('[Plugin Sandbox] Received message:', msg.type);

  if (msg.type === 'serialize-selection') {
    const selection = figma.currentPage.selection;
    console.log('[Plugin Sandbox] Selection count:', selection.length);

    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Kein Frame ausgewaehlt. Waehle zuerst einen Frame aus.' });
      return;
    }

    const node = selection[0];
    const allowed = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'GROUP']);
    if (!allowed.has(node.type)) {
      figma.ui.postMessage({ type: 'error', message: `"${node.name}" ist ein ${node.type}. Bitte einen Frame oder eine Komponente auswaehlen.` });
      return;
    }

    console.log('[Plugin Sandbox] Serializing:', node.name, node.type);
    try {
      const data = serializeNode(node);
      console.log('[Plugin Sandbox] Serialized OK, children:', data.children.length);
      figma.ui.postMessage({
        type: 'frame-data',
        data,
        meta: { name: node.name, width: node.width, height: node.height },
      });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: 'Serialisierung fehlgeschlagen: ' + err.message });
    }
  }

  if (msg.type === 'open-url') {
    figma.openExternal(msg.url);
  }

  if (msg.type === 'notify') {
    figma.notify(msg.message, { timeout: msg.timeout || 3000 });
  }
};

figma.showUI(__html__, { width: 380, height: 520, themeColors: true });
