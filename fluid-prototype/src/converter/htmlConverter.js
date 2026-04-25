/**
 * HTML-to-Pipeline-JSON Converter
 *
 * Parses Claude Design HTML exports and converts them into the Figma-like
 * JSON format that the BMW HMI pipeline expects. Uses a Claude API call
 * to assign meaningful BMW HMI component names to the nodes.
 *
 * Usage:
 *   import { parseHtmlToFigmaJson } from './htmlConverter.js';
 *   const figmaJson = await parseHtmlToFigmaJson(htmlString, apiKey);
 *
 * CLI:
 *   node --env-file=.env src/converter/htmlConverter.js <file.html>
 */

import { parse } from 'node-html-parser';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514';

// Tags we skip entirely
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE', 'BR', 'HR']);

// Tags that become TEXT nodes
const TEXT_TAGS = new Set(['P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LABEL', 'A', 'STRONG', 'EM', 'B', 'I']);

let _idCounter = 0;

// ---------------------------------------------------------------------------
// Style parser — extracts inline CSS into structured properties
// ---------------------------------------------------------------------------

function parseInlineStyle(styleStr) {
  if (!styleStr) return {};
  const props = {};
  for (const decl of styleStr.split(';')) {
    const [key, ...valParts] = decl.split(':');
    if (!key || !valParts.length) continue;
    const prop = key.trim();
    const val = valParts.join(':').trim();
    props[prop] = val;
  }
  return props;
}

function parsePx(val) {
  if (!val) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : Math.round(num);
}

function parseColor(val) {
  if (!val || val === 'transparent' || val === 'none') return null;
  return val;
}

function colorToFigmaFill(cssColor) {
  if (!cssColor) return [];
  const hex = cssColor.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const r = parseInt(hex[1].slice(0, 2), 16) / 255;
    const g = parseInt(hex[1].slice(2, 4), 16) / 255;
    const b = parseInt(hex[1].slice(4, 6), 16) / 255;
    return [{ type: 'SOLID', visible: true, color: { r, g, b, a: 1 } }];
  }
  const rgb = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgb) {
    return [{
      type: 'SOLID', visible: true,
      color: { r: +rgb[1] / 255, g: +rgb[2] / 255, b: +rgb[3] / 255, a: rgb[4] ? +rgb[4] : 1 },
    }];
  }
  return [{ type: 'SOLID', visible: true, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }];
}

// ---------------------------------------------------------------------------
// DOM node → Figma-like node
// ---------------------------------------------------------------------------

function convertNode(htmlNode, parentX = 0, parentY = 0) {
  if (htmlNode.nodeType === 3) {
    const text = htmlNode.text.trim();
    if (!text) return null;
    return {
      id: `html-${++_idCounter}`,
      name: text.slice(0, 40),
      type: 'TEXT',
      characters: text,
      absoluteBoundingBox: { x: parentX, y: parentY, width: 200, height: 20 },
      fills: [],
      style: { fontSize: 16, fontWeight: 400, fontFamily: 'Inter', textAlignHorizontal: 'LEFT' },
      children: [],
    };
  }

  if (htmlNode.nodeType !== 1) return null;

  const tag = htmlNode.tagName;
  if (!tag || SKIP_TAGS.has(tag)) return null;

  const css = parseInlineStyle(htmlNode.getAttribute('style'));
  const id = `html-${++_idCounter}`;

  const x = parentX + parsePx(css.left || css['margin-left']);
  const y = parentY + parsePx(css.top || css['margin-top']);
  const width = parsePx(css.width) || parsePx(css['min-width']) || parsePx(htmlNode.getAttribute('width'));
  const height = parsePx(css.height) || parsePx(css['min-height']) || parsePx(htmlNode.getAttribute('height'));

  const bgColor = parseColor(css.background || css['background-color']);
  const borderColor = parseColor(css['border-color'] || css.border?.split(' ').pop());
  const borderWidth = parsePx(css['border-width'] || css.border?.split(' ')[0]);
  const borderRadius = parsePx(css['border-radius']);

  const isText = TEXT_TAGS.has(tag);
  const isSvg = tag === 'SVG';
  const isImg = tag === 'IMG';
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

  let nodeType = 'FRAME';
  if (isText) nodeType = 'TEXT';
  else if (isSvg) nodeType = 'VECTOR';
  else if (isImg) nodeType = 'RECTANGLE';
  else if (isInput) nodeType = 'FRAME';

  const textContent = isText ? htmlNode.text.trim() : null;

  const layoutMode = css.display === 'flex'
    ? (css['flex-direction'] === 'column' ? 'VERTICAL' : 'HORIZONTAL')
    : null;

  const node = {
    id,
    name: htmlNode.getAttribute('data-name')
      || htmlNode.getAttribute('aria-label')
      || htmlNode.getAttribute('alt')
      || htmlNode.id
      || htmlNode.getAttribute('class')?.split(' ')[0]
      || (textContent ? textContent.slice(0, 30) : tag.toLowerCase()),
    type: nodeType,
    absoluteBoundingBox: {
      x, y,
      width: width || (isText ? 200 : 400),
      height: height || (isText ? 24 : 300),
    },
    fills: colorToFigmaFill(bgColor),
    strokes: borderColor ? colorToFigmaFill(borderColor) : [],
    strokeWeight: borderWidth,
    cornerRadius: borderRadius,
    layoutMode: layoutMode,
    itemSpacing: parsePx(css.gap),
    paddingTop: parsePx(css['padding-top'] || css.padding),
    paddingRight: parsePx(css['padding-right'] || css.padding),
    paddingBottom: parsePx(css['padding-bottom'] || css.padding),
    paddingLeft: parsePx(css['padding-left'] || css.padding),
    children: [],
  };

  if (textContent) {
    node.characters = textContent;
    const fontSize = parsePx(css['font-size']) || 16;
    const fontWeight = parseInt(css['font-weight']) || 400;
    node.style = {
      fontSize,
      fontWeight,
      fontFamily: css['font-family']?.split(',')[0]?.replace(/['"]/g, '').trim() || 'Inter',
      textAlignHorizontal: (css['text-align'] || 'left').toUpperCase(),
    };
  }

  if (isImg) {
    node.name = htmlNode.getAttribute('alt') || 'image';
  }

  if (isSvg) {
    node.name = 'icon';
    return node;
  }

  for (const child of htmlNode.childNodes) {
    const converted = convertNode(child, x, y);
    if (converted) node.children.push(converted);
  }

  return node;
}

// ---------------------------------------------------------------------------
// Claude API call for semantic layer naming
// ---------------------------------------------------------------------------

const NAMING_PROMPT = `You are a BMW HMI wireframe analyzer. Given a simplified UI node tree from an HTML export, assign meaningful BMW HMI component names to each node.

## Available Component Names (use these exact strings):
- map, mapView, mapArea
- routeInfo, routePanel, routeCard, etaPanel
- turnIndicator, turnByTurn, maneuver
- searchBar, searchField, addressInput
- dock, dockItem, tabBar, bottomNav
- statusBar, topBar, header
- sidePanel, detailPanel, drawer
- mediaPlayer, nowPlaying, musicCard, albumArt, playbackControls
- radioPlayer, radioStation
- podcastPlayer
- climateControl, temperatureControl, acControl
- quickAction, quickActionBar, floatingButton
- poiList, poiItem, resultList
- speedLimit, speedDisplay
- vehicleInfo, rangeDisplay, batteryStatus
- chargingStation, chargeStatus
- weatherWidget
- card, tile, widget
- button, iconButton, cta
- toggle, switch, slider
- heading, title, subtitle, label, text
- divider, separator
- image, avatar, icon
- container, section, page, screen, frame, group
- popup, modal, dialog, overlay, toast, notification
- footer, climatebar

## Rules
1. Analyze each node's type, dimensions, text content, and position to determine the best name
2. Use the MOST SPECIFIC name available (e.g. "routeInfo" instead of "card" for a route details panel)
3. Preserve the exact tree structure — only change the "name" field
4. Return valid JSON — the exact same tree structure with updated names
5. For the root node, choose a screen-level name (e.g. "navigationScreen", "mediaScreen", "homeScreen")

## Input format
Each node has: id, name (current generic name), type, dimensions {w,h}, text (if any), childCount

## Output format
Return a JSON object mapping node IDs to their new names:
{ "html-1": "navigationScreen", "html-2": "mapArea", "html-3": "routeInfo", ... }`;

function buildCompactTree(node) {
  const entry = {
    id: node.id,
    name: node.name,
    type: node.type,
    dimensions: {
      w: node.absoluteBoundingBox.width,
      h: node.absoluteBoundingBox.height,
    },
  };
  if (node.characters) entry.text = node.characters.slice(0, 60);
  if (node.children?.length) {
    entry.childCount = node.children.length;
    entry.children = node.children.map(buildCompactTree);
  }
  return entry;
}

async function assignLayerNames(tree, apiKey) {
  const client = new Anthropic({ apiKey });
  const compactTree = buildCompactTree(tree);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: NAMING_PROMPT,
    messages: [{
      role: 'user',
      content: `Assign BMW HMI component names to this wireframe tree:\n\n\`\`\`json\n${JSON.stringify(compactTree, null, 2)}\n\`\`\``,
    }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  let nameMap;
  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    nameMap = JSON.parse(cleaned);
  } catch {
    process.stderr.write('  Warning: Could not parse naming response, using generic names\n');
    return tree;
  }

  function applyNames(node) {
    if (nameMap[node.id]) {
      node.name = nameMap[node.id];
    }
    for (const child of node.children ?? []) applyNames(child);
    return node;
  }

  return applyNames(tree);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an HTML string (from Claude Design export) into the Figma-like JSON
 * format expected by the BMW HMI pipeline.
 *
 * @param {string} htmlString — raw HTML from Claude Design export
 * @param {string} apiKey — Anthropic API key for layer naming
 * @returns {Promise<object>} Figma-like JSON frame
 */
export async function parseHtmlToFigmaJson(htmlString, apiKey) {
  _idCounter = 0;

  const root = parse(htmlString);
  const body = root.querySelector('body') || root;

  const topElements = body.childNodes.filter(n =>
    (n.nodeType === 1 && !SKIP_TAGS.has(n.tagName)) ||
    (n.nodeType === 3 && n.text.trim())
  );

  let frameNode;
  if (topElements.length === 1 && topElements[0].nodeType === 1) {
    frameNode = convertNode(topElements[0], 0, 0);
  } else {
    frameNode = {
      id: `html-${++_idCounter}`,
      name: 'screen',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 1920, height: 720 },
      fills: [],
      children: topElements.map(el => convertNode(el, 0, 0)).filter(Boolean),
      layoutMode: 'VERTICAL',
      itemSpacing: 0,
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    };
  }

  if (!frameNode) {
    throw new Error('HTML contains no convertible elements');
  }

  if (!frameNode.absoluteBoundingBox.width) {
    frameNode.absoluteBoundingBox.width = 1920;
  }
  if (!frameNode.absoluteBoundingBox.height) {
    frameNode.absoluteBoundingBox.height = 720;
  }

  process.stderr.write(`  Parsed HTML → ${countNodes(frameNode)} nodes\n`);

  if (apiKey) {
    process.stderr.write('  Assigning BMW HMI layer names via Claude…\n');
    frameNode = await assignLayerNames(frameNode, apiKey);
    process.stderr.write('  Layer naming complete\n');
  }

  return frameNode;
}

function countNodes(node) {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && (
  process.argv[1].endsWith('htmlConverter.js') ||
  process.argv[1].endsWith('src/converter/htmlConverter.js')
);

if (isMain) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node --env-file=.env src/converter/htmlConverter.js <file.html>');
    process.exit(1);
  }

  const { readFileSync } = await import('fs');
  const html = readFileSync(filePath, 'utf-8');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const result = await parseHtmlToFigmaJson(html, apiKey);
  console.log(JSON.stringify(result, null, 2));
}
