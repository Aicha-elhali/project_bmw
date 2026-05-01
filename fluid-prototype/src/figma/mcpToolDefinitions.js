/**
 * MCP Tool Definitions for Claude Agents
 *
 * These tool definitions are passed to the Anthropic API so Claude
 * can call Figma MCP tools during code generation (Phase 4).
 */

import { getDesignContext, getMetadata, getScreenshot } from './mcpClient.js';

export function buildFigmaToolDefinitions(fileKey, nodeIds) {
  const nodeList = Array.isArray(nodeIds) ? nodeIds.join(', ') : nodeIds;

  return [
    {
      name: 'figma_get_design_context',
      description: `Fetch structured React code context (styles, layout, component hierarchy) for a Figma node. The current file is "${fileKey}" with frames: ${nodeList}. Use this to get detailed styling and layout information for a specific part of the design when you need more detail than what the component tree provides.`,
      input_schema: {
        type: 'object',
        properties: {
          node_id: {
            type: 'string',
            description: 'Figma node ID (e.g. "16:4"). Use one of the frame IDs provided, or a child node ID from the metadata.',
          },
        },
        required: ['node_id'],
      },
    },
    {
      name: 'figma_get_metadata',
      description: `Fetch the layer tree (IDs, names, types, positions, sizes) for a Figma node. The current file is "${fileKey}" with frames: ${nodeList}. Use this to explore the design hierarchy and find specific layers or components.`,
      input_schema: {
        type: 'object',
        properties: {
          node_id: {
            type: 'string',
            description: 'Figma node ID (e.g. "16:4").',
          },
        },
        required: ['node_id'],
      },
    },
    {
      name: 'figma_get_screenshot',
      description: `Capture a visual screenshot of a Figma node. Use this to see what the design actually looks like when you need to verify your understanding of the layout or visual appearance.`,
      input_schema: {
        type: 'object',
        properties: {
          node_id: {
            type: 'string',
            description: 'Figma node ID (e.g. "16:4").',
          },
        },
        required: ['node_id'],
      },
    },
  ];
}

export async function handleToolCall(toolName, toolInput, fileKey) {
  const nodeId = toolInput.node_id;

  switch (toolName) {
    case 'figma_get_design_context': {
      const ctx = await getDesignContext(fileKey, nodeId);
      return [{ type: 'text', text: ctx }];
    }
    case 'figma_get_metadata': {
      const meta = await getMetadata(fileKey, nodeId);
      return [{ type: 'text', text: meta }];
    }
    case 'figma_get_screenshot': {
      const screenshot = await getScreenshot(fileKey, nodeId);
      if (screenshot && typeof screenshot === 'object' && screenshot.data) {
        return [{ type: 'image', source: { type: 'base64', media_type: screenshot.mimeType, data: screenshot.data } }];
      }
      return [{ type: 'text', text: typeof screenshot === 'string' ? screenshot : 'Screenshot not available' }];
    }
    default:
      return [{ type: 'text', text: `Unknown tool: ${toolName}` }];
  }
}
