/**
 * Phase 1 — Figma REST API Client
 * Fetches raw Figma node data and extracts relevant node types.
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Node types we care about — extend this list as needed
const SUPPORTED_NODE_TYPES = new Set([
  'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE',
  'TEXT', 'RECTANGLE', 'VECTOR', 'ELLIPSE', 'LINE',
  'COMPONENT_SET',
]);

/**
 * Fetch a single node (frame) from the Figma API.
 * @param {string} fileKey  — Figma file key (from URL)
 * @param {string} nodeId   — Node ID in format "16:4" or "16-4"
 * @param {string} token    — Figma personal access token
 * @returns {Promise<object>} Raw Figma node JSON
 */
export async function fetchFigmaFrame(fileKey, nodeId, token) {
  // Normalize nodeId: Figma URLs use "16-4", API expects "16:4"
  const normalizedId = nodeId.replace('-', ':');
  const encodedId = encodeURIComponent(normalizedId);

  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodedId}&geometry=paths`;

  let response;
  try {
    response = await fetch(url, {
      headers: { 'X-Figma-Token': token },
    });
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
    throw new Error(
      `Frame "${normalizedId}" not found in file "${fileKey}". ` +
      `Make sure the frame exists and your token has read access.`
    );
  }

  return node.document;
}

/**
 * Recursively extract only supported node types from the tree.
 * Unsupported nodes are still traversed so their children aren't lost.
 * @param {object} node — Figma node
 * @returns {object} Filtered node tree
 */
export function extractSupportedNodes(node) {
  const filtered = {
    id: node.id,
    name: node.name,
    type: node.type,
    // Geometry & layout
    absoluteBoundingBox: node.absoluteBoundingBox ?? null,
    size: node.size ?? null,
    // Visual properties
    fills: node.fills ?? [],
    strokes: node.strokes ?? [],
    strokeWeight: node.strokeWeight ?? 0,
    cornerRadius: node.cornerRadius ?? 0,
    // Auto-layout
    layoutMode: node.layoutMode ?? null,         // HORIZONTAL | VERTICAL | null
    primaryAxisAlignItems: node.primaryAxisAlignItems ?? null,
    counterAxisAlignItems: node.counterAxisAlignItems ?? null,
    itemSpacing: node.itemSpacing ?? 0,
    paddingLeft: node.paddingLeft ?? 0,
    paddingRight: node.paddingRight ?? 0,
    paddingTop: node.paddingTop ?? 0,
    paddingBottom: node.paddingBottom ?? 0,
    // Text
    characters: node.characters ?? null,
    style: node.style ?? null,
    // Component reference
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

/**
 * Convenience: fetch + extract in one call.
 */
export async function getFigmaFrame(fileKey, nodeId, token) {
  const raw = await fetchFigmaFrame(fileKey, nodeId, token);
  return extractSupportedNodes(raw);
}

/**
 * Fetch multiple frames in a single Figma API request.
 * @param {string}   fileKey  — Figma file key
 * @param {string[]} nodeIds  — Array of node IDs ("16:4", "16:5", …)
 * @param {string}   token    — Figma personal access token
 * @returns {Promise<Map<string, object>>} Map of nodeId → extracted frame
 */
export async function getFigmaFrames(fileKey, nodeIds, token) {
  const normalizedIds = nodeIds.map(id => id.replace('-', ':'));
  const encodedIds = normalizedIds.map(encodeURIComponent).join(',');

  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodedIds}&geometry=paths`;

  let response;
  try {
    response = await fetch(url, {
      headers: { 'X-Figma-Token': token },
    });
  } catch (err) {
    throw new Error(`Figma API unreachable: ${err.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Figma API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const results = new Map();

  for (const id of normalizedIds) {
    const node = data.nodes?.[id];
    if (!node) {
      console.warn(`  ⚠  Frame "${id}" not found in file, skipping`);
      continue;
    }
    results.set(id, extractSupportedNodes(node.document));
  }

  if (results.size === 0) {
    throw new Error(
      `None of the requested frames [${normalizedIds.join(', ')}] found in file "${fileKey}".`
    );
  }

  return results;
}
