# Fluid Prototype Pipeline

Transforms a Figma wireframe into a runnable Vite + React app automatically.

## Setup

```bash
cd fluid-prototype
npm install
```

## Required Environment Variables

```bash
export FIGMA_TOKEN="your-figma-personal-access-token"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

Get your Figma token: Figma → Settings → Account → Personal access tokens  
Get your Anthropic key: console.anthropic.com → API Keys

## Run the Pipeline

```bash
node pipeline.js --file <FIGMA_FILE_KEY> --frame <NODE_ID>
```

**Example:**
```bash
node pipeline.js --file TL9xgNNemU88nwUbSjiHQR --frame 16:4
```

The file key and node ID come from the Figma URL:
```
https://www.figma.com/design/TL9xgNNemU88nwUbSjiHQR/Untitled?node-id=16-4
                              ^^^^^^^^^^^^^^^^^^^^^^               ^^^^
                              file key                             node id (16-4 = 16:4)
```

## Start the Generated App

```bash
cd output
npm install
npm run dev
```

Then open http://localhost:5173

## Customize Design Tokens

Edit `tokens/tokens.json` before running the pipeline:

```json
{
  "colors": {
    "primary":    "#0066CC",   ← main brand color (buttons, links)
    "background": "#FFFFFF",   ← page background
    "surface":    "#F5F5F5",   ← card/panel backgrounds
    "text":       "#1A1A1A",   ← body text
    "accent":     "#FF4D00"    ← highlights, badges
  },
  "spacing": {
    "xs": "4px",  "sm": "8px",  "md": "16px",
    "lg": "24px", "xl": "32px", "xxl": "48px"
  },
  "typography": {
    "heading": { "size": "24px", "weight": "700", "family": "Inter, sans-serif" },
    "body":    { "size": "16px", "weight": "400", "family": "Inter, sans-serif" }
  },
  "borderRadius": { "sm": "4px", "md": "8px", "lg": "16px", "full": "9999px" },
  "shadows": {
    "sm": "0 1px 3px rgba(0,0,0,0.12)",
    "md": "0 4px 6px rgba(0,0,0,0.10)"
  }
}
```

## Extend the Component Mapping

To teach the transformer new component types, edit `src/transformer/index.js`:

```js
// Add a new pattern to NAME_PATTERNS:
[/tooltip|popover/i, 'tooltip'],
```

Then add token mapping for that type in `src/design/tokenEngine.js` inside the `switch(type)` block.

## Project Structure

```
fluid-prototype/
├── src/
│   ├── figma/          ← Figma REST API client (Phase 1)
│   ├── transformer/    ← Figma JSON → component tree (Phase 2)
│   ├── design/         ← Design token engine (Phase 3)
│   ├── generator/      ← Claude prompt builder + API client (Phase 4)
│   └── output/         ← Vite app writer (Phase 5)
├── tokens/
│   └── tokens.json     ← Edit your design tokens here
├── output/             ← Generated Vite + React app (created by pipeline)
├── pipeline.js         ← Main entry point (Phase 6)
└── package.json
```
