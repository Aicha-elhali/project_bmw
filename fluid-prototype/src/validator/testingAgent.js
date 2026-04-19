import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a senior QA engineer for BMW iDrive automotive interfaces.
You review generated React code for a 1920x720 dark-theme car display.
Every check is grounded in BMW Automotive UI/UX Design Constraints — safety and brand identity are non-negotiable.

Analyze the files for these categories:

## Critical (app will crash)
- Missing \`export default\` in any .jsx file
- Import referencing a file that does not exist in the provided file list
- main.jsx is a component instead of the React entry point (must contain createRoot)
- Syntax errors (unclosed JSX, mismatched brackets, undefined variables)
- Circular or broken import chains

## Warning (visual/UX degradation — BMW Design Constraint violations)

### Safety & Driver Context
- Touch targets (buttons, interactive) smaller than 44px / 2.75rem — minimum for automotive use
- More than 7 primary actions (clickable/tappable) visible on a single screen
- Information architecture deeper than 3 navigation levels
- Modal overlays covering more than 40% of the screen area
- Animation/transition durations exceeding 300ms for system feedback
- Spring/bouncy easing (e.g. cubic-bezier with overshoot) on primary UI elements
- Simultaneous animations on more than 2 elements
- Parallax scroll effects or autoplay video/GIF backgrounds

### Brand Identity — BMW DNA
- Light or white backgrounds (#FFFFFF or any light color) on any surface
- Pure #000000 as background instead of BMW dark values (#0D0D0D, #1A1A1A)
- Consumer-app patterns: bottom navigation bars (Instagram-style), hamburger menus as primary nav
- Tesla-style layouts: unstructured horizontal mega-screens without clear hierarchy
- Warm gold accent colors (Rolls-Royce/Mercedes territory)
- Sporty red (#FF0000, #E00, etc.) as primary accent (Ferrari/Audi Sport territory)
- Gamification elements, playful blob shadows, character illustrations

### Typography
- Wrong font family — must be bmwTypeNextWeb as primary (Inter, Roboto, System-UI are BANNED)
- More than 3 font-weight variants used on a single screen
- ALL CAPS text longer than 4 words
- Body/paragraph text smaller than 14px / 0.875rem
- Letter-spacing below -0.02em on headings
- Missing font-weight: 300 as default weight

### Color & Contrast
- Missing BMW Blue (#1C69D4) for active/selected states
- More than 2 accent colors used simultaneously on one screen
- Purple, pink, or green gradients (consumer-app aesthetic)
- Colored drop-shadows (iOS-trend color shadows)
- Pastel colors as primary system colors
- No surface differentiation — all dark surfaces using same color (must have ≥3 levels: #0D0D0D, #1A1A1A, #262626)
- Low contrast that would fail WCAG AA (4.5:1 for text)

### Components & Patterns
- Glassmorphism (backdrop-filter: blur) as primary design pattern
- Neumorphism (inset box-shadow light/dark pattern)
- Emoji used as UI icons
- Mixed icon styles (outline and filled icons on the same screen)
- Icons smaller than 24px in touch-interactive areas
- Border-radius > 12px on primary containers (BMW max: 12px, not playful/rounded)
- Invisible text (dark text on dark background, or white text on light surface)
- Standard unrestyled UI library components (shadcn, MUI, Bootstrap look)

Respond with ONLY this JSON, no other text:
{
  "approved": boolean,
  "summary": "one-line assessment",
  "issues": [
    {
      "file": "src/components/Foo.jsx",
      "severity": "critical" | "warning",
      "rule": "missing-export | broken-import | main-overwritten | syntax-error | light-bg | pure-black-bg | invisible-text | small-target | max-actions | deep-nesting | large-modal | slow-animation | spring-easing | consumer-pattern | tesla-layout | wrong-accent-gold | wrong-accent-red | emoji-icon | wrong-font | too-many-weights | allcaps-long | text-too-small | tight-letterspacing | missing-bmw-blue | too-many-accents | banned-gradient | color-shadow | pastel-color | no-surface-layers | low-contrast | glassmorphism | neumorphism | mixed-icons | small-icons | large-radius | gamification | other",
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ]
}

Set "approved" to false ONLY if there are critical issues. Warnings alone do NOT block approval.`;

function buildUserMessage(files, tokens) {
  let msg = 'Review these BMW iDrive React app files.\n\n';
  msg += '## Available files\n\n';
  msg += [...files.keys()].map(f => `- ${f}`).join('\n');
  msg += '\n\n## File contents\n\n';

  for (const [path, code] of files) {
    msg += `### ${path}\n\`\`\`jsx\n${code}\n\`\`\`\n\n`;
  }

  if (tokens) {
    msg += `## Design tokens (ground truth)\n\`\`\`json\n${JSON.stringify(tokens, null, 2)}\n\`\`\`\n\n`;
  }

  msg += 'Return the JSON verdict.';
  return msg;
}

function parseJsonResponse(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

export async function runTestingAgent(files, { apiKey, tokens }) {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(files, tokens) }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  try {
    const verdict = parseJsonResponse(text);
    return {
      approved: verdict.approved === true,
      summary: verdict.summary || '',
      issues: Array.isArray(verdict.issues) ? verdict.issues : [],
    };
  } catch (e) {
    return {
      approved: false,
      summary: 'Testing agent returned unparseable response',
      issues: [{
        file: '',
        severity: 'critical',
        rule: 'other',
        description: 'Testing agent response was not valid JSON: ' + text.slice(0, 200),
        suggestion: 'Re-run validation',
      }],
    };
  }
}
