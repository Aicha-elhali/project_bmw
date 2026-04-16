# BMW Fluid Prototype

AI-powered pipeline that transforms Figma designs into runnable React websites using design tokens.

## Architecture

```
Figma Frame
    │
    ├──► token-pipeline/     Extract semantic design tokens (Claude vision)
    │         │
    │         ▼
    │    sets/*.json          Named token sets (brand, navi-dark, ...)
    │         │
    └──► fluid-prototype/    Generate Vite + React app (Claude code gen)
              │
              ▼
         output/              Runnable website
```

## Quick Start

```bash
# 1. Set credentials
export FIGMA_TOKEN="your-token"
export ANTHROPIC_API_KEY="your-key"

# 2. Extract tokens from a Figma frame
cd token-pipeline
npm install
node pipeline.js --file <FILE_KEY> --frame <NODE_ID>

# 3. Generate the website
cd ../fluid-prototype
npm install
node pipeline.js --file <FILE_KEY> --frame <NODE_ID> --prompt "navigation with speed 120kmh"

# 4. Run it
cd output && npm install && npm run dev
```

See [token-pipeline/README.md](token-pipeline/README.md) and [fluid-prototype/README.md](fluid-prototype/README.md) for details.
