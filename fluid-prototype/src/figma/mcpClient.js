/**
 * Figma MCP Client
 *
 * Connects to the Figma MCP server (remote or local) and exposes
 * tool wrappers for fetching design metadata, context, and screenshots.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const MCP_REMOTE_URL = 'https://mcp.figma.com/mcp';

let _client = null;
let _transport = null;

export async function connectMCP(figmaToken) {
  if (_client) return _client;

  const url = new URL(MCP_REMOTE_URL);

  const headers = {
    'Authorization': `Bearer ${figmaToken}`,
    'X-Figma-Token': figmaToken,
  };

  try {
    _transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
    });
  } catch {
    _transport = new SSEClientTransport(url, {
      requestInit: { headers },
    });
  }

  _client = new Client({ name: 'bmw-hmi-pipeline', version: '1.0.0' });
  await _client.connect(_transport);
  return _client;
}

export async function closeMCP() {
  if (_client) {
    await _client.close().catch(() => {});
    _client = null;
    _transport = null;
  }
}

export function getClient() {
  return _client;
}

function extractText(result) {
  if (!result?.content) return '';
  return result.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');
}

function extractImage(result) {
  if (!result?.content) return null;
  const img = result.content.find(c => c.type === 'image');
  return img ? { data: img.data, mimeType: img.mimeType } : null;
}

/**
 * Fetch layer metadata (IDs, names, types, positions, sizes).
 * Returns the raw text/XML from the MCP server.
 */
export async function getMetadata(fileKey, nodeIds) {
  if (!_client) throw new Error('MCP not connected — call connectMCP() first');

  const nodeRef = Array.isArray(nodeIds)
    ? nodeIds.map(id => `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(id)}`).join('\n')
    : `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(nodeIds)}`;

  const result = await _client.callTool({
    name: 'get_metadata',
    arguments: { figma_url: nodeRef },
  });

  return extractText(result);
}

/**
 * Fetch structured design context (React code context with styles/layout).
 */
export async function getDesignContext(fileKey, nodeIds) {
  if (!_client) throw new Error('MCP not connected — call connectMCP() first');

  const nodeRef = Array.isArray(nodeIds)
    ? nodeIds.map(id => `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(id)}`).join('\n')
    : `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(nodeIds)}`;

  const result = await _client.callTool({
    name: 'get_design_context',
    arguments: { figma_url: nodeRef },
  });

  return extractText(result);
}

/**
 * Capture a screenshot of the specified node(s).
 * Returns { data: base64String, mimeType: 'image/png' } or null.
 */
export async function getScreenshot(fileKey, nodeIds) {
  if (!_client) throw new Error('MCP not connected — call connectMCP() first');

  const nodeRef = Array.isArray(nodeIds)
    ? nodeIds.map(id => `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(id)}`).join('\n')
    : `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(nodeIds)}`;

  const result = await _client.callTool({
    name: 'get_screenshot',
    arguments: { figma_url: nodeRef },
  });

  return extractImage(result) ?? extractText(result);
}

/**
 * Fetch design variable definitions (tokens, colors, spacing, typography).
 */
export async function getVariableDefs(fileKey) {
  if (!_client) throw new Error('MCP not connected — call connectMCP() first');

  const result = await _client.callTool({
    name: 'get_variable_defs',
    arguments: { figma_url: `https://www.figma.com/design/${fileKey}` },
  });

  return extractText(result);
}
