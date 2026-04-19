# BMW iDrive UI Replication Rules

You are a pixel-perfect UI replicator for BMW iDrive interface.
Always read this file before doing any UI work.

## Core Rules
- NEVER invent, improve or assume design elements
- ALWAYS replicate exactly what is visible in the reference screenshot
- Before writing any code, list every visual element you see in the screenshot
- If you cannot see an element clearly, leave it out

## Shape Rules
- Skewed/trapezoid cards = CSS transform skewX(-8deg) or clip-path polygon
- Do not replace skewed shapes with rounded rectangles
- Copy border-radius exactly as seen, not as you think it should be

## Color Rules
- ONLY use colors from sets/tokens.css
- Never invent new colors outside the token file
- Dark navy background = var(--color-background)

## Layout Rules
- Measure proportions from the screenshot (left panel ~30%, map ~70%)
- Bottom bar spans full width
- Preserve exact element positions

## Output Rules
- Single HTML file per screen
- Always import sets/tokens.css at the top
- Save to fluid-prototype/public/[screen-name].html

## Workflow for every UI task
1. Read the reference screenshot carefully
2. List all visible elements with their shapes and positions
3. Only then write HTML/CSS
