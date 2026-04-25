/**
 * Backend Prompt Builder
 *
 * Builds the prompt for the Backend Agent that generates
 * services, hooks, and contexts for API integrations.
 * Outputs an INTERFACE.md documenting all exports for the Frontend Agent.
 */

// ---------------------------------------------------------------------------
// Helpers (shared with frontendPromptBuilder)
// ---------------------------------------------------------------------------

function collectTypes(node, types = new Set()) {
  types.add(node.type);
  for (const child of node.children ?? []) collectTypes(child, types);
  return types;
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Build a prompt for the Backend Agent.
 * @param {object}  componentTree — Phase 3 output
 * @param {object}  apiConfig     — resolved from apiRegistry
 * @returns {string|null} prompt text, or null if no APIs detected
 */
export function buildBackendPrompt(componentTree, apiConfig) {
  if (!apiConfig.hasAPIs) return null;

  const usedTypes = [...collectTypes(componentTree)];
  const pkgNames = Object.keys(apiConfig.packages || {});
  const envVars = apiConfig.envVars || {};

  const envSection = Object.keys(envVars).length > 0 ? `
## Environment Variables

These are available via \`import.meta.env.VITE_*\` (Vite injects them at build time):

${Object.entries(envVars).map(([key, desc]) => `- \`${key}\` — ${desc}`).join('\n')}

If a key is not set, services MUST fall back to mock/static data. The prototype must work without any keys configured.
` : '';

  return `
You are building the data/service layer for a BMW HMI prototype (React + Vite).
The frontend will be built separately by another agent — you ONLY generate the backend layer.

## Detected Component Types

${usedTypes.join(', ')}

## Detected Services

${apiConfig.detectedServices.join(', ')}

## Available NPM Packages (already in package.json)

${pkgNames.length > 0 ? pkgNames.map(p => `- ${p}`).join('\n') : '- None (use browser fetch() only)'}
${envSection}
## API Documentation

${apiConfig.promptSections.join('\n\n')}

${apiConfig.mediaContext ? `
## Shared Media Context

When multiple media sources are detected (Spotify, Radio, Podcast), generate a shared MediaContext:

${apiConfig.mediaContext}
` : ''}

## Your Task

Generate the complete service layer. Files to create:

### Services (\`services/*.js\`)
One file per API. Each exports async functions that fetch data and return typed objects.
- Must handle errors with try/catch
- Must return fallback data when API keys are missing or requests fail
- Must use AbortController for fetch cleanup
- Must read API keys from \`import.meta.env.VITE_*\`

### Hooks (\`hooks/*.js\`)
Custom React hooks that wrap services for use in components.
- Return \`{ data, loading, error }\` pattern
- Use useEffect with cleanup (AbortController)
- Cache results with useRef/useMemo where sensible
- Return stable references (useCallback for functions)

### Contexts (\`context/*.jsx\`)
React contexts for shared state (e.g., MediaContext for multi-source audio).
- Export both the Context and a Provider component
- Provider must work without props (sensible defaults)
- Export a convenience hook: \`useMediaContext()\` etc.

### INTERFACE.md (PFLICHT!)
You MUST output a file called INTERFACE.md that documents every export:

\`\`\`md
# INTERFACE

## Services

### mapService.js
- \`searchLocation(query: string): Promise<{ lat, lng, name, address }[]>\`
- \`getRoute(from, to): Promise<GeoJSON>\`

## Hooks

### useMapSearch(query)
Returns: \`{ results: Location[], loading: boolean, error: string|null }\`

### useRoute(from, to)
Returns: \`{ route: GeoJSON|null, distance: string, duration: string, loading: boolean }\`

## Contexts

### MediaContext
Provider: \`<MediaProvider>\`
Hook: \`useMedia()\`
Returns: \`{ currentTrack, isPlaying, play(url), pause(), source: 'spotify'|'radio'|'podcast' }\`
\`\`\`

## Rules

1. \`// FILE: services/mapService.js\` format for each file
2. ES Modules only
3. NO UI code, NO JSX rendering, NO styling
4. Every fetch needs error handling + fallback data
5. Env vars via \`import.meta.env.VITE_*\`
6. INTERFACE.md is mandatory — the frontend agent depends on it

## Output Format

\`\`\`js
// FILE: services/mapService.js
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
// ...
\`\`\`

\`\`\`md
// FILE: INTERFACE.md
# INTERFACE
// ...
\`\`\`

Generate all service files, then hooks, then contexts, then INTERFACE.md last.
`.trim();
}

/**
 * Build backend prompt for multi-frame input.
 * Same as single-frame but merges types from all frames.
 */
export function buildMultiFrameBackendPrompt(frames, apiConfig) {
  if (!apiConfig.hasAPIs) return null;

  const mergedTree = {
    type: 'screen', label: 'MergedRoot',
    children: frames.map(f => f.tree),
    layout: { direction: 'column' }, style: {},
  };

  return buildBackendPrompt(mergedTree, apiConfig);
}
