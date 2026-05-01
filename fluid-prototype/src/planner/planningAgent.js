import Anthropic from '@anthropic-ai/sdk';
import { getDesignKnowledge } from '../knowledge/bmwDesignSystem.js';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a senior BMW HMI architect who analyzes Figma wireframes and creates implementation plans for a multi-agent code generation pipeline.

You receive a component tree (from a Figma wireframe), screen classification, detected APIs, design tokens, and the BMW HMI Design System reference.

Your job: analyze the wireframe and write tailored implementation briefs for four downstream agents:
1. **Backend Agent** — generates services, hooks, contexts for API integrations
2. **Frontend Agent** — generates React UI components and App.jsx
3. **Design QA Agent** — validates generated code against BMW design system
4. **Design Fix Agent** — fixes issues found by QA

## Output Format

Respond with ONLY this JSON:
{
  "analysis": {
    "screenType": "navigation | media | climate | settings | home | other",
    "description": "one-line description of what this screen shows",
    "components": ["ComponentName1", "ComponentName2"],
    "hasMap": boolean,
    "hasAPIs": boolean,
    "layoutStrategy": "brief description of layout approach"
  },
  "backendPlan": "Markdown instructions for Backend Agent (what services/hooks/contexts to create, API contracts, data models). Only include if APIs are detected, otherwise null.",
  "frontendPlan": "Markdown instructions for Frontend Agent (component structure, layout positions, interactions, which design patterns to apply for each component).",
  "designQAPlan": "Markdown instructions for Design QA Agent (what to focus on, expected layout, known edge cases for this screen type).",
  "designFixPlan": "Markdown instructions for Design Fix Agent (priority ordering for this specific screen, known patterns that need attention)."
}

## Planning Guidelines

- Analyze the component tree to understand what the designer intended
- Map each wireframe element to a React component
- Specify exact positions from safeZoneHint data for each component
- Identify which BMW design patterns apply (map screen, card list, media player, etc.)
- For the QA plan: highlight what's most likely to go wrong for this screen type
- For the Fix plan: prioritize fixes by visual impact
- Reference design system rules by name (e.g., "Card Recipe", "BMW Blue") — the agents have the full design system reference
- Keep plans concise — focus on wireframe-specific decisions, not generic rules the agents already know`;

function buildUserMessage(componentTrees, classification, apiConfig, tokens, userPrompt, designKnowledge) {
  let msg = '';

  if (userPrompt) {
    msg += `## User Requirements (HIGHEST PRIORITY)\n\n> ${userPrompt}\n\nThese requirements override the BMW Design Guide. Include them in all agent plans.\n\n`;
  }

  msg += `## BMW HMI Design System Reference\n\n${designKnowledge}\n\n`;

  msg += `## Screen Classification\n\n`;
  if (Array.isArray(classification)) {
    for (const c of classification) {
      msg += `- **${c.frameName}**: ${c.frameType} (${c.placement}), context: ${c.screenContext}, ${c.dimensions.width}x${c.dimensions.height}px\n`;
    }
  } else {
    msg += `- **${classification.frameName}**: ${classification.frameType} (${classification.placement}), context: ${classification.screenContext}, ${classification.dimensions.width}x${classification.dimensions.height}px\n`;
  }
  msg += '\n';

  if (apiConfig?.hasAPIs) {
    msg += `## Detected APIs\n\n`;
    msg += `Services: ${apiConfig.detectedServices.join(', ')}\n`;
    msg += `Packages: ${Object.keys(apiConfig.packages || {}).join(', ')}\n\n`;
  }

  msg += `## Component Trees\n\n`;
  const trees = Array.isArray(componentTrees) ? componentTrees : [componentTrees];
  for (const tree of trees) {
    msg += `\`\`\`json\n${JSON.stringify(trimTree(tree), null, 2)}\n\`\`\`\n\n`;
  }

  msg += `Now analyze this wireframe and create implementation plans for all four agents.`;
  return msg;
}

function trimTree(node, maxDepth = 5, depth = 0) {
  const trimmed = { type: node.type, label: node.label, children: [] };
  if (node.safeZoneHint) trimmed.safeZoneHint = node.safeZoneHint;
  if (node.relativeLayout) trimmed.relativeLayout = node.relativeLayout;
  if (node.content) trimmed.content = node.content;
  if (depth < maxDepth && node.children?.length) {
    trimmed.children = node.children.map(c => trimTree(c, maxDepth, depth + 1));
  } else if (node.children?.length) {
    trimmed._truncated = `${node.children.length} children`;
  }
  return trimmed;
}

function parseJsonResponse(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

export async function runPlanningAgent(componentTrees, classification, apiConfig, tokens, { apiKey, userPrompt }) {
  const client = new Anthropic({ apiKey });
  const designKnowledge = getDesignKnowledge();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: buildUserMessage(componentTrees, classification, apiConfig, tokens, userPrompt, designKnowledge),
    }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  try {
    const plan = parseJsonResponse(text);
    return {
      analysis: plan.analysis || {},
      backendPlan: plan.backendPlan || null,
      frontendPlan: plan.frontendPlan || '',
      designQAPlan: plan.designQAPlan || '',
      designFixPlan: plan.designFixPlan || '',
    };
  } catch (e) {
    process.stderr.write(`  ⚠  Planning agent returned unparseable response, using fallback\n`);
    return {
      analysis: { screenType: 'other', description: 'Planning failed', components: [], hasMap: false, hasAPIs: false, layoutStrategy: 'default' },
      backendPlan: null,
      frontendPlan: '',
      designQAPlan: '',
      designFixPlan: '',
    };
  }
}
