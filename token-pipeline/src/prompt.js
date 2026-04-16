/**
 * Builds the Claude prompt for AI-powered token extraction.
 *
 * The prompt includes:
 *   1. The rendered Figma image (as a vision content block)
 *   2. The structural data (collected fills, text styles, spacing, etc.)
 *   3. The exact output schema the pipeline expects
 *   4. Interpretation guidelines so Claude makes smart semantic decisions
 */

/**
 * Build the message content array for Claude (image + text).
 *
 * @param {string}   imageBase64    — PNG image of the Figma frame
 * @param {object}   collectedData  — Output from collector.js
 * @param {object}   meta           — { fileKey, frameId }
 * @param {string[]} existingSets   — Names of token sets already in sets/
 * @returns {Array} Content blocks for Claude messages API
 */
export function buildPromptContent(imageBase64, collectedData, meta, existingSets = []) {
  const dataJson = JSON.stringify(collectedData, null, 2);

  const content = [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: imageBase64,
      },
    },
    {
      type: 'text',
      text: buildTextPrompt(dataJson, meta, existingSets),
    },
  ];

  return content;
}

function buildTextPrompt(dataJson, meta, existingSets = []) {
  const setsHint = existingSets.length > 0
    ? `\n\nThese token sets already exist: ${existingSets.map(s => `"${s}"`).join(', ')}. If this design clearly belongs to one of them, reuse that name. Otherwise suggest a new one.`
    : '';

  return `You are a design systems engineer. The image above shows a rendered Figma frame. Below is the raw structural data extracted from the same frame (colors, text styles, spacing, gradients, shadows, strokes — each with the Figma node name and context where it appears).

Your task: combine what you SEE in the image with the precise VALUES from the data to produce a semantic design token file.

## What the image tells you that data alone cannot

- Overall theme: is this a dark UI or light UI?
- Visual hierarchy: which text is a heading vs. a data display vs. a label?
- Color relationships: which color is the background vs. an accent vs. decorative?
- Gradients: are they decorative glows, background effects, or functional overlays?
- Layout patterns: dense dashboard vs. spacious content page?

## What the data tells you that the image alone cannot

- Exact hex values, font sizes in px, spacing values in px
- Node names that reveal intent (e.g. "StatusbarClock", "CarmarkerGlow", "MenuButton")
- Precise gradient stop colors and positions
- Corner radius values, shadow parameters

## Output format

Return a single JSON code block with exactly this structure. Fill EVERY field.

\`\`\`json
{
  "colors": {
    "primary": "",
    "primaryHover": "",
    "primaryLight": "",
    "primarySubtle": "",
    "background": "",
    "backgroundLight": "",
    "surface": "",
    "text": "",
    "textDark": "",
    "textSecondary": "",
    "textMuted": "",
    "textOnDark": "",
    "textOnDarkSecondary": "",
    "textOnDarkMuted": "",
    "accent": "",
    "border": "",
    "borderDark": "",
    "focusRing": "",
    "success": "",
    "error": "",
    "overlay": "",
    "shadow": "",
    "shadowStrong": ""
  },
  "spacing": {
    "xs": "",
    "sm": "",
    "md": "",
    "lg": "",
    "xl": "",
    "xxl": "",
    "section": "",
    "touchTarget": ""
  },
  "typography": {
    "heading1": { "size": "", "sizeDesktop": "", "weight": "", "family": "", "lineHeight": "", "lineHeightDesktop": "", "letterSpacing": "" },
    "heading2": { "size": "", "sizeDesktop": "", "weight": "", "family": "", "lineHeight": "", "lineHeightDesktop": "", "letterSpacing": "" },
    "heading3": { "size": "", "sizeDesktop": "", "weight": "", "family": "", "lineHeight": "", "lineHeightDesktop": "", "letterSpacing": "" },
    "heading":    { "size": "", "weight": "", "family": "", "lineHeight": "" },
    "subheading": { "size": "", "weight": "", "family": "", "lineHeight": "" },
    "body":       { "size": "", "weight": "", "family": "", "lineHeight": "" },
    "bodySmall":  { "size": "", "weight": "", "family": "", "lineHeight": "" },
    "small":      { "size": "", "weight": "", "family": "", "lineHeight": "" },
    "label":      { "size": "", "weight": "", "family": "", "lineHeight": "", "letterSpacing": "" }
  },
  "fontWeights": {
    "default": "",
    "input": "",
    "clickable": "",
    "link": "",
    "price": ""
  },
  "borderRadius": {
    "none": "0",
    "sm": "",
    "md": "",
    "lg": "",
    "xl": "",
    "xxl": "",
    "full": ""
  },
  "shadows": {
    "sm": "",
    "md": "",
    "focus": "",
    "focusInset": ""
  },
  "transitions": {
    "fast": "",
    "medium": "",
    "slow": ""
  },
  "breakpoints": {
    "small": "",
    "medium": "",
    "large": "",
    "xl": "",
    "xxl": ""
  },
  "_meta": {
    "name": "",
    "description": "",
    "brand": "",
    "theme": "",
    "source": "Extracted from Figma file ${meta.fileKey}, frame ${meta.frameId}",
    "font": ""
  }
}
\`\`\`

## Interpretation rules

1. **Colors** — Look at the IMAGE to understand the overall palette, then use the DATA for exact values.
   - Root frame fill → \`background\`
   - Most prominent saturated color → \`primary\` / \`accent\` / \`focusRing\`
   - Generate \`primaryHover\` (slightly darker), \`primaryLight\`, \`primarySubtle\` from the primary
   - Text fills on dark bg → \`text\`, \`textOnDark\`; on light bg → \`textDark\`
   - Lower-opacity or grey text → \`textSecondary\`, \`textMuted\`, \`textOnDarkSecondary\`, \`textOnDarkMuted\`
   - If gradients exist, add extra keys like \`"backgroundGradient": "linear-gradient(...)"\`
   - For success/error/overlay, choose values that fit the detected theme

2. **Typography** — Use node names AND the image to decide what is a heading vs. data display vs. label.
   - A node named "SpeedometerValue" showing "83" in huge text is a DATA DISPLAY, not a heading. Do NOT use it for the heading scale.
   - Actual headings are labelled "Title", "Heading", or visually function as section headers.
   - Map real UI text styles to the hierarchy: heading1 (largest heading) → label (smallest).
   - Use rem (px / 16). Wrap the detected font family in quotes with Arial/Helvetica/sans-serif fallbacks.

3. **Spacing** — Infer a base grid from the spacing data (often 4px or 8px). Build a full scale.
   - \`touchTarget\` must be >= 3rem (48px) for accessibility.

4. **Border radius** — Small values (1–4px) → sm. Medium (6–12px) → md. Large (16+) → lg/xl. 9999px → full.

5. **Shadows** — Convert to CSS box-shadow. If no shadows found, provide sensible defaults.

6. **Transitions & breakpoints** — Figma doesn't store these. Use standard values (0.2s–0.5s ease, 768/1024/1280/1920px).

7. All sizes in **rem** where applicable (spacing, typography). Base = 16px.

8. **Set naming** — In \`_meta.name\`, suggest a short kebab-case name for this token set based on what you see (e.g. "navigation-dark-hud", "dashboard-gauges", "brand-homepage"). Max 30 characters, lowercase, hyphens only. In \`_meta.description\`, write a one-line description of the design (max 100 chars).${setsHint}

## Structural data from Figma

\`\`\`json
${dataJson}
\`\`\`

Return ONLY the JSON code block. No explanation.`;
}
