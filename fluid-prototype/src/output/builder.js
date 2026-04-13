/**
 * Phase 5 — Output Builder
 *
 * Writes the generated React components + Vite scaffolding
 * into an output/ directory that can be started with:
 *   cd output && npm install && npm run dev
 */

import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Vite scaffolding templates
// ---------------------------------------------------------------------------

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fluid Prototype</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; padding: 0; font-family: Inter, system-ui, sans-serif; }
      #root { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const MAIN_JSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

const OUTPUT_PACKAGE_JSON = JSON.stringify({
  name: 'fluid-prototype-output',
  version: '1.0.0',
  type: 'module',
  scripts: {
    dev:     'vite',
    build:   'vite build',
    preview: 'vite preview',
  },
  dependencies: {
    react:     '^18.2.0',
    'react-dom': '^18.2.0',
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.2.0',
    vite: '^5.0.0',
  },
}, null, 2);

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

// Fallback App.jsx when Claude didn't generate one
function buildFallbackApp(componentFiles) {
  const imports = componentFiles
    .filter(f => f !== 'App.jsx' && f !== 'main.jsx')
    .map(f => {
      const name = f.replace('.jsx', '');
      return `import ${name} from './components/${name}.jsx';`;
    })
    .join('\n');

  const usages = componentFiles
    .filter(f => f !== 'App.jsx' && f !== 'main.jsx')
    .map(f => `      <${f.replace('.jsx', '')} />`)
    .join('\n');

  return `import React from 'react';
${imports}

// Auto-generated App.jsx — assembles all Figma-derived components
const App = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
${usages}
    </div>
  );
};

export default App;
`;
}

// ---------------------------------------------------------------------------
// Main writer
// ---------------------------------------------------------------------------

/**
 * Write all generated files to the output directory.
 * @param {Map<string, string>} generatedFiles — filename → code from Phase 4
 * @param {string} outputDir — destination path (e.g. "./output")
 * @returns {Promise<string[]>} list of written file paths
 */
export async function writeOutput(generatedFiles, outputDir) {
  // Clean and recreate output dir
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(join(outputDir, 'src', 'components'), { recursive: true });

  const written = [];

  // Vite scaffolding
  await writeFile(join(outputDir, 'index.html'),        INDEX_HTML,         'utf-8');
  await writeFile(join(outputDir, 'vite.config.js'),    VITE_CONFIG,        'utf-8');
  await writeFile(join(outputDir, 'package.json'),       OUTPUT_PACKAGE_JSON,'utf-8');
  written.push('index.html', 'vite.config.js', 'package.json');

  // Separate App/main from component files
  const fileEntries = [...generatedFiles.entries()];
  const appFile   = fileEntries.find(([f]) => f === 'App.jsx');
  const mainFile  = fileEntries.find(([f]) => f === 'main.jsx');
  const compFiles = fileEntries.filter(([f]) => f !== 'App.jsx' && f !== 'main.jsx');

  // Write components
  for (const [filename, code] of compFiles) {
    const dest = join(outputDir, 'src', 'components', filename);
    await writeFile(dest, code, 'utf-8');
    written.push(`src/components/${filename}`);
  }

  // Write or generate App.jsx
  const appCode = appFile
    ? appFile[1]
    : buildFallbackApp(compFiles.map(([f]) => f));

  // Fix import paths in App.jsx to point to ./components/
  const fixedApp = appCode.replace(
    /from ['"]\.\/(\w+)\.jsx['"]/g,
    "from './components/$1.jsx'"
  );
  await writeFile(join(outputDir, 'src', 'App.jsx'), fixedApp, 'utf-8');
  written.push('src/App.jsx');

  // Write or generate main.jsx
  const mainCode = mainFile ? mainFile[1] : MAIN_JSX;
  await writeFile(join(outputDir, 'src', 'main.jsx'), mainCode, 'utf-8');
  written.push('src/main.jsx');

  return written;
}
