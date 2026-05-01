/**
 * Phase 1 — Figma Client
 *
 * Fetches Figma frame data via MCP (primary) or REST API (fallback).
 * The MCP path uses get_metadata for structured layer data.
 * The REST path fetches raw JSON and filters it.
 */

import { connectMCP, getMetadata, getScreenshot as mcpGetScreenshot, closeMCP } from './mcpClient.js';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

const SUPPORTED_NODE_TYPES = new Set([
  'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE',
  'TEXT', 'RECTANGLE', 'VECTOR', 'ELLIPSE', 'LINE',
  'COMPONENT_SET',
]);

let _useMCP = true;

export function setUseMCP(enabled) {
  _useMCP = enabled;
}

// ---------------------------------------------------------------------------
// MCP metadata → Figma node shape adapter
// ---------------------------------------------------------------------------

function parseMetadataXML(xmlText) {
  const nodes = [];
  const lines = xmlText.split('\n');

  function parseNode(text) {
    const nameMatch = text.match(/name="([^"]*)"/);
    const typeMatch = text.match(/type="([^"]*)"/);
    const idMatch = text.match(/id="([^"]*)"/);
    const xMatch = text.match(/x="([^"]*)"/);
    const yMatch = text.match(/y="([^"]*)"/);
    const wMatch = text.match(/width="([^"]*)"/);
    const hMatch = text.match(/height="([^"]*)"/);
    const textMatch = text.match(/characters="([^"]*)"/);
    const fontSizeMatch = text.match(/fontSize="([^"]*)"/);
    const fontWeightMatch = text.match(/fontWeight="([^"]*)"/);
    const fillMatch = text.match(/fill="([^"]*)"/);
    const cornerRadiusMatch = text.match(/cornerRadius="([^"]*)"/);
    const layoutModeMatch = text.match(/layoutMode="([^"]*)"/);
    const itemSpacingMatch = text.match(/itemSpacing="([^"]*)"/);
    const visibleMatch = text.match(/visible="([^"]*)"/);

    return {
      id: idMatch?.[1] ?? '',
      name: nameMatch?.[1] ?? '',
      type: typeMatch?.[1] ?? 'FRAME',
      absoluteBoundingBox: {
        x: parseFloat(xMatch?.[1] ?? '0'),
        y: parseFloat(yMatch?.[1] ?? '0'),
        width: parseFloat(wMatch?.[1] ?? '0'),
        height: parseFloat(hMatch?.[1] ?? '0'),
      },
      size: {
        width: parseFloat(wMatch?.[1] ?? '0'),
        height: parseFloat(hMatch?.[1] ?? '0'),
      },
      fills: fillMatch ? [{ type: 'SOLID', visible: true, color: hexToFigmaColor(fillMatch[1]) }] : [],
      strokes: [],
      strokeWeight: 0,
      cornerRadius: parseFloat(cornerRadiusMatch?.[1] ?? '0'),
      layoutMode: layoutModeMatch?.[1] ?? null,
      primaryAxisAlignItems: null,
      counterAxisAlignItems: null,
      itemSpacing: parseFloat(itemSpacingMatch?.[1] ?? '0'),
      paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
      characters: textMatch?.[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') ?? null,
      style: fontSizeMatch ? {
        fontSize: parseFloat(fontSizeMatch[1]),
        fontWeight: parseFloat(fontWeightMatch?.[1] ?? '400'),
        fontFamily: 'BMW Type Next',
        lineHeightPx: parseFloat(fontSizeMatch[1]) * 1.4,
        textAlignHorizontal: 'LEFT',
      } : null,
      componentId: null,
      visible: visibleMatch ? visibleMatch[1] !== 'false' : true,
      children: [],
    };
  }

  const stack = [];
  let root = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const selfClosing = trimmed.match(/^<(\w+)\s[^>]*\/>/);
    if (selfClosing) {
      const node = parseNode(trimmed);
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else {
        root = node;
      }
      continue;
    }

    const opening = trimmed.match(/^<(\w+)[\s>]/);
    if (opening && !trimmed.startsWith('</')) {
      const node = parseNode(trimmed);
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else {
        root = node;
      }
      stack.push(node);
      continue;
    }

    const closing = trimmed.match(/^<\/(\w+)>/);
    if (closing) {
      stack.pop();
    }
  }

  return root;
}

function hexToFigmaColor(hex) {
  if (!hex || !hex.startsWith('#')) return { r: 0, g: 0, b: 0, a: 1 };
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

// ---------------------------------------------------------------------------
// REST API functions (fallback)
// ---------------------------------------------------------------------------

async function fetchFigmaFrameREST(fileKey, nodeId, token) {
  const normalizedId = nodeId.replace('-', ':');
  const encodedId = encodeURIComponent(normalizedId);
  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodedId}&geometry=paths`;

  let response;
  try {
    response = await fetch(url, { headers: { 'X-Figma-Token': token } });
  } catch (err) {
    throw new Error(`Figma API unreachable: ${err.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Figma API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const node = data.nodes?.[normalizedId];
  if (!node) {
    throw new Error(`Frame "${normalizedId}" not found in file "${fileKey}".`);
  }
  return node.document;
}

export function extractSupportedNodes(node) {
  const filtered = {
    id: node.id,
    name: node.name,
    type: node.type,
    absoluteBoundingBox: node.absoluteBoundingBox ?? null,
    size: node.size ?? null,
    fills: node.fills ?? [],
    strokes: node.strokes ?? [],
    strokeWeight: node.strokeWeight ?? 0,
    cornerRadius: node.cornerRadius ?? 0,
    layoutMode: node.layoutMode ?? null,
    primaryAxisAlignItems: node.primaryAxisAlignItems ?? null,
    counterAxisAlignItems: node.counterAxisAlignItems ?? null,
    itemSpacing: node.itemSpacing ?? 0,
    paddingLeft: node.paddingLeft ?? 0,
    paddingRight: node.paddingRight ?? 0,
    paddingTop: node.paddingTop ?? 0,
    paddingBottom: node.paddingBottom ?? 0,
    characters: node.characters ?? null,
    style: node.style ?? null,
    componentId: node.componentId ?? null,
    visible: node.visible ?? true,
  };

  if (node.children?.length) {
    filtered.children = node.children
      .filter(child => child.visible !== false)
      .map(extractSupportedNodes);
  } else {
    filtered.children = [];
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// MCP fetch functions
// ---------------------------------------------------------------------------

async function fetchFigmaFrameMCP(fileKey, nodeId, token) {
  await connectMCP(token);
  const metadata = await getMetadata(fileKey, nodeId);
  const parsed = parseMetadataXML(metadata);
  if (!parsed) {
    throw new Error(`MCP returned no parseable metadata for node "${nodeId}" in file "${fileKey}".`);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Public API — auto-selects MCP or REST
// ---------------------------------------------------------------------------

export async function getFigmaFrame(fileKey, nodeId, token) {
  if (_useMCP) {
    try {
      return await fetchFigmaFrameMCP(fileKey, nodeId, token);
    } catch (err) {
      console.warn(`  ⚠  MCP fetch failed (${err.message}), falling back to REST API`);
      const raw = await fetchFigmaFrameREST(fileKey, nodeId, token);
      return extractSupportedNodes(raw);
    }
  }
  const raw = await fetchFigmaFrameREST(fileKey, nodeId, token);
  return extractSupportedNodes(raw);
}

export async function getFigmaFrames(fileKey, nodeIds, token) {
  const results = new Map();

  if (_useMCP) {
    try {
      await connectMCP(token);
      for (const nodeId of nodeIds) {
        const normalizedId = nodeId.replace('-', ':');
        const metadata = await getMetadata(fileKey, normalizedId);
        const parsed = parseMetadataXML(metadata);
        if (parsed) {
          results.set(normalizedId, parsed);
        } else {
          console.warn(`  ⚠  MCP: Frame "${normalizedId}" returned no data, skipping`);
        }
      }
      if (results.size > 0) return results;
      console.warn('  ⚠  MCP returned no frames, falling back to REST API');
    } catch (err) {
      console.warn(`  ⚠  MCP fetch failed (${err.message}), falling back to REST API`);
    }
  }

  // REST API fallback
  const normalizedIds = nodeIds.map(id => id.replace('-', ':'));
  const encodedIds = normalizedIds.map(encodeURIComponent).join(',');
  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodedIds}&geometry=paths`;

  let response;
  try {
    response = await fetch(url, { headers: { 'X-Figma-Token': token } });
  } catch (err) {
    throw new Error(`Figma API unreachable: ${err.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Figma API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  for (const id of normalizedIds) {
    const node = data.nodes?.[id];
    if (!node) {
      console.warn(`  ⚠  Frame "${id}" not found in file, skipping`);
      continue;
    }
    results.set(id, extractSupportedNodes(node.document));
  }

  if (results.size === 0) {
    throw new Error(`None of the requested frames [${normalizedIds.join(', ')}] found in file "${fileKey}".`);
  }

  return results;
}

/**
 * Fetch a screenshot via MCP. Returns { data, mimeType } or null.
 */
export async function getFigmaScreenshot(fileKey, nodeId, token) {
  try {
    await connectMCP(token);
    return await mcpGetScreenshot(fileKey, nodeId);
  } catch (err) {
    console.warn(`  ⚠  Screenshot fetch failed: ${err.message}`);
    return null;
  }
}

export { closeMCP } from './mcpClient.js';
