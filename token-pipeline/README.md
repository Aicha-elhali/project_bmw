# AI Token Pipeline

Extracts semantic design tokens from Figma frames using Claude's vision API. Sends both a rendered PNG and structural node data to Claude, which interprets the visual design and produces meaningful token sets.

## Setup

```bash
cd token-pipeline
npm install
```

## Required Environment Variables

```bash
export FIGMA_TOKEN="your-figma-personal-access-token"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## Extract Tokens

```bash
node pipeline.js --file <FIGMA_FILE_KEY> --frame <NODE_ID>
```

**Example:**
```bash
node pipeline.js --file 7KXAyktDQstWMRVVE8aOxp --frame 16:495
```

After extraction, Claude suggests a set name and description. You can accept or type your own:

```
  Claude suggests:
    Name:        navi-dark
    Description: Dark navigation overlay with speed display

  Set name [navi-dark]: █
```

The token set is saved to `sets/<name>.json`.

### Options

| Flag | Description |
|------|-------------|
| `--file` | Figma file key (from URL) |
| `--frame` | Frame node ID (e.g. `16:495` or `16-495`) |
| `--name` | Skip interactive prompt, use this name directly |
| `--scale` | Image export scale 1-4 (default: 2) |
| `--dry-run` | Print tokens to stdout without saving |

## How It Works

1. **Fetch** — Downloads the Figma frame data and renders it as a PNG image
2. **Collect** — Walks the node tree extracting colors, gradients, text styles, spacings, radii, shadows, and strokes with context (which node, which parent)
3. **Analyze** — Sends the image + structural data to Claude as a multimodal prompt. Claude interprets what it sees (not just raw values) to produce semantic tokens
4. **Save** — Writes the token set to `sets/<name>.json`

## Token Output Format

Each set is a JSON file with semantic categories:

```json
{
  "_meta": { "name": "navi-dark", "description": "...", "theme": "dark" },
  "colors": { "background": "#1A1A1A", "primary": "#0066CC", ... },
  "typography": { "heading": { "size": "1.5rem", "weight": "700", ... }, ... },
  "spacing": { "xs": "0.25rem", "sm": "0.5rem", ... },
  "borderRadius": { "sm": "0.25rem", "md": "0.5rem", ... },
  "shadows": { ... },
  "gradients": { ... },
  "transitions": { ... }
}
```

## Using Token Sets

Token sets in `sets/` are automatically picked up by the [fluid-prototype pipeline](../fluid-prototype/). Claude receives all available sets and chooses the right tokens per component, mixing sets when appropriate.

```bash
cd ../fluid-prototype
node pipeline.js --file <FILE_KEY> --frame <NODE_ID>

# Or with a scene description:
node pipeline.js --file <FILE_KEY> --frame <NODE_ID> --prompt "navigation with speed 120kmh"
```

## Project Structure

```
token-pipeline/
├── src/
│   ├── figma.js        <- Figma API client (frame data + PNG export)
│   ├── collector.js    <- Structural data walker (colors, styles, spacing)
│   ├── prompt.js       <- Multimodal prompt builder (image + text)
│   └── claude.js       <- Claude API client (token extraction)
├── sets/               <- Saved token sets (one JSON per extraction)
├── pipeline.js         <- Main CLI entry point
└── package.json
```
