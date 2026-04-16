# Fluid Prototype Pipeline

Transforms a Figma wireframe into a runnable Vite + React app using Claude AI and design tokens.

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

Get your Figma token: Figma Settings > Account > Personal access tokens
Get your Anthropic key: console.anthropic.com > API Keys

## Run the Pipeline

```bash
node pipeline.js --file <FIGMA_FILE_KEY> --frame <NODE_ID>
```

**Example:**
```bash
node pipeline.js --file TL9xgNNemU88nwUbSjiHQR --frame 16:4
```

**With a scene description** (controls what Claude generates):
```bash
node pipeline.js --file TL9xgNNemU88nwUbSjiHQR --frame 16:4 --prompt "navigation with speed 120kmh"
```

The `--prompt` flag lets you describe what the UI should show (text, numbers, states). Claude uses this to decide content and which token sets fit best.

### Figma URL to Parameters

```
https://www.figma.com/design/TL9xgNNemU88nwUbSjiHQR/Untitled?node-id=16-4
                              ^^^^^^^^^^^^^^^^^^^^^^               ^^^^
                              file key                             node id (16-4 = 16:4)
```

## Token Sets

The pipeline loads **all** token sets from `../token-pipeline/sets/` and sends them to Claude. Claude picks the most appropriate set per component and can mix tokens across sets.

For example:
- Brand header -> brand tokens (colors, typography)
- Navigation overlay -> navi-dark tokens (spacing, shadows)
- Alert popup -> alert tokens

If no sets exist in `../token-pipeline/sets/`, it falls back to `tokens/tokens.json`.

To create token sets, use the [token-pipeline](../token-pipeline/).

## Start the Generated App

```bash
cd output
npm install
npm run dev
```

Then open http://localhost:5173

## Project Structure

```
fluid-prototype/
├── src/
│   ├── figma/          <- Figma REST API client (Phase 1)
│   ├── transformer/    <- Figma JSON -> component tree (Phase 2)
│   ├── generator/      <- Claude prompt builder + API client (Phase 3-4)
│   └── output/         <- Vite app writer (Phase 5)
├── tokens/
│   └── tokens.json     <- Fallback design tokens
├── output/             <- Generated Vite + React app
├── pipeline.js         <- Main entry point
└── package.json
```
