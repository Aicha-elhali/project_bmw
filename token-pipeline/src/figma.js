/**
 * Figma REST API client.
 *
 * Two capabilities:
 *   1. Fetch raw node data (fills, text styles, layout, effects)
 *   2. Export the frame as a rendered PNG image for Claude vision
 */

const FIGMA_API = 'https://api.figma.com/v1';

/**
 * Normalise a node ID from URL format ("1-2") to API format ("1:2").
 */
function normaliseId(nodeId) {
  return nodeId.includes(':') ? nodeId : nodeId.replace('-', ':');
}

// ---------------------------------------------------------------------------
// 1. Fetch raw node document
// ---------------------------------------------------------------------------

export async function fetchFrame(fileKey, nodeId, token) {
  const id  = normaliseId(nodeId);
  const url = `${FIGMA_API}/files/${fileKey}/nodes?ids=${encodeURIComponent(id)}`;

  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Figma API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const node = data.nodes?.[id];
  if (!node) {
    throw new Error(
      `Frame "${id}" not found in file "${fileKey}". ` +
      `Check the node-id in the Figma URL and your token's access.`
    );
  }
  return node.document;
}

// ---------------------------------------------------------------------------
// 2. Export frame as PNG (for Claude vision)
// ---------------------------------------------------------------------------

export async function fetchFrameImage(fileKey, nodeId, token, scale = 2) {
  const id  = normaliseId(nodeId);
  const url = `${FIGMA_API}/images/${fileKey}?ids=${encodeURIComponent(id)}&format=png&scale=${scale}`;

  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Figma image export ${res.status}: ${body}`);
  }

  const data = await res.json();
  const imageUrl = data.images?.[id];
  if (!imageUrl) {
    throw new Error(`No image returned for node "${id}".`);
  }

  // Download the PNG and return as base64
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download rendered image: ${imgRes.status}`);

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  return buffer.toString('base64');
}
