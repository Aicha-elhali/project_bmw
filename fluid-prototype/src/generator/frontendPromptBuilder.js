/**
 * Frontend Prompt Builder
 *
 * Builds the prompt for the Frontend Agent that generates
 * UI components using the BMW HMI Design System.
 * Receives the backend INTERFACE.md to know what hooks/contexts to import.
 *
 * Refactored from promptBuilder.js — delegates to it for the core prompt,
 * then wraps with backend context.
 */

import { buildGenerationPrompt, buildMultiFramePrompt } from './promptBuilder.js';

// ---------------------------------------------------------------------------
// Backend context injection
// ---------------------------------------------------------------------------

function buildBackendContextSection(interfaceDoc, backendFiles) {
  if (!interfaceDoc && (!backendFiles || backendFiles.size === 0)) return '';

  let section = `
## BACKEND LAYER (pre-built — verfuegbar in services/, hooks/, context/)

Pre-built Service-Module sind bereits vorhanden.
Du MUSST die folgenden Hooks und Contexts importieren statt eigene API-Calls zu schreiben.
Schreibe KEINE eigenen fetch()-Calls, KEINE eigenen Services.

`;

  if (interfaceDoc) {
    section += `### Interface-Dokumentation

\`\`\`md
${interfaceDoc}
\`\`\`

`;
  }

  if (backendFiles && backendFiles.size > 0) {
    section += `### Generierte Backend-Dateien

${[...backendFiles.keys()].map(f => `- \`${f}\``).join('\n')}

**Import-Beispiele (aus Komponenten-Dateien):**
\`\`\`jsx
`;
    for (const filename of backendFiles.keys()) {
      if (filename.startsWith('hooks/')) {
        const hookName = filename.replace('hooks/', '').replace('.js', '');
        section += `import { use${capitalize(hookName)} } from '../${filename}';\n`;
      } else if (filename.startsWith('context/')) {
        const ctxName = filename.replace('context/', '').replace('.jsx', '');
        section += `import { use${capitalize(ctxName)} } from '../${filename}';\n`;
      } else if (filename.startsWith('services/')) {
        section += `// services/${filename.split('/').pop()} — nur ueber Hooks verwenden, nicht direkt importieren\n`;
      }
    }
    section += `\`\`\`

**Import-Beispiele (aus App.jsx):**
\`\`\`jsx
`;
    for (const filename of backendFiles.keys()) {
      if (filename.startsWith('context/')) {
        const ctxName = filename.replace('context/', '').replace('.jsx', '').replace('Context', '');
        section += `import { ${capitalize(ctxName)}Provider } from './${filename}';\n`;
      }
    }
    section += `\`\`\`
`;
  }

  section += `
### Regeln fuer Backend-Integration
- Importiere Hooks/Contexts aus den generierten Dateien
- KEINE eigenen fetch()-Calls oder API-Wrapper
- KEINE eigenen Service-Dateien erstellen
- Context-Provider in App.jsx wrappen (innerhalb HMIDisplay)
- Hooks nur innerhalb von Komponenten aufrufen (nicht auf Modul-Ebene)
`;

  return section;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build frontend prompt for single-frame input.
 * @param {object}  componentTree
 * @param {object}  tokens
 * @param {object}  apiConfig
 * @param {string|null}  interfaceDoc — INTERFACE.md from backend agent
 * @param {Map<string,string>|null} backendFiles — generated backend files
 * @returns {string}
 */
export function buildFrontendPrompt(componentTree, tokens, apiConfig, interfaceDoc, backendFiles, userPrompt = '', mcpContext = null) {
  const basePrompt = buildGenerationPrompt(componentTree, tokens, apiConfig, userPrompt, mcpContext);
  const backendContext = buildBackendContextSection(interfaceDoc, backendFiles);

  if (!backendContext) return basePrompt;

  // Inject backend context before "## Your Task"
  const taskMarker = '## Your Task';
  const idx = basePrompt.indexOf(taskMarker);
  if (idx === -1) return basePrompt + '\n\n' + backendContext;

  return basePrompt.slice(0, idx) + backendContext + '\n\n' + basePrompt.slice(idx);
}

/**
 * Build frontend prompt for multi-frame input.
 * @param {Array}   frames
 * @param {object}  tokens
 * @param {object}  apiConfig
 * @param {object}  options — describePlacement, describeDefaultBackground
 * @param {string|null}  interfaceDoc
 * @param {Map<string,string>|null} backendFiles
 * @returns {string}
 */
export function buildMultiFrameFrontendPrompt(frames, tokens, apiConfig, options, interfaceDoc, backendFiles, userPrompt = '', mcpContext = null) {
  const basePrompt = buildMultiFramePrompt(frames, tokens, apiConfig, options, userPrompt, mcpContext);
  const backendContext = buildBackendContextSection(interfaceDoc, backendFiles);

  if (!backendContext) return basePrompt;

  const taskMarker = '## Your Task';
  const idx = basePrompt.indexOf(taskMarker);
  if (idx === -1) return basePrompt + '\n\n' + backendContext;

  return basePrompt.slice(0, idx) + backendContext + '\n\n' + basePrompt.slice(idx);
}
