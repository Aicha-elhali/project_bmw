/**
 * Phase 5 — Output Builder (BMW iDrive Console Screen)
 *
 * Writes the generated React components + Vite scaffolding.
 * Dynamically adds npm packages and HTML head tags based on
 * the API config resolved from detected component types.
 *
 *   cd output && npm install && npm run dev
 */

import { mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname }        from 'path';

// ---------------------------------------------------------------------------
// Dynamic Vite scaffolding builders
// ---------------------------------------------------------------------------

function buildIndexHtml(headTags = []) {
  const extraHead = headTags.length > 0
    ? '\n    ' + headTags.join('\n    ')
    : '';

  return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, initial-scale=1.0" />
    <title>BMW iDrive Navigation</title>${extraHead}
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
      #root { width: 100vw; height: 100vh; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

function buildPackageJson(extraDependencies = {}) {
  return JSON.stringify({
    name: 'bmw-idrive-navigation',
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev:     'vite',
      build:   'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react:       '^18.2.0',
      'react-dom': '^18.2.0',
      ...extraDependencies,
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.2.0',
      vite: '^5.0.0',
    },
  }, null, 2);
}

const MAIN_JSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// BMW iDrive global styles
const globalStyles = [
  '@font-face {',
  "  font-family: 'bmwTypeNextWeb';",
  "  src: local('Arial');",
  '  font-weight: 300;',
  '  font-style: normal;',
  '}',
  '@font-face {',
  "  font-family: 'bmwTypeNextWeb';",
  "  src: local('Arial');",
  '  font-weight: 400;',
  '  font-style: normal;',
  '}',
  '@font-face {',
  "  font-family: 'bmwTypeNextWeb';",
  "  src: local('Arial');",
  '  font-weight: 500;',
  '  font-style: normal;',
  '}',
  '@font-face {',
  "  font-family: 'bmwTypeNextWeb';",
  "  src: local('Arial');",
  '  font-weight: 700;',
  '  font-style: normal;',
  '}',
  '* {',
  '  box-sizing: border-box;',
  '  margin: 0;',
  '  padding: 0;',
  '  -webkit-tap-highlight-color: transparent;',
  '}',
  'html {',
  '  font-size: 16px;',
  '  -webkit-font-smoothing: antialiased;',
  '  -moz-osx-font-smoothing: grayscale;',
  '}',
  'body {',
  '  font-family: "bmwTypeNextWeb", "Arial", "Helvetica", sans-serif;',
  '  font-weight: 300;',
  '  background-color: #000000;',
  '  color: #FFFFFF;',
  '  width: 100vw;',
  '  height: 100vh;',
  '  overflow: hidden;',
  '  cursor: default;',
  '  user-select: none;',
  '}',
  '#root {',
  '  width: 100%;',
  '  height: 100%;',
  '}',
  'button {',
  '  font-family: inherit;',
  '  cursor: pointer;',
  '  border: none;',
  '  background: none;',
  '  color: inherit;',
  '}',
  'input {',
  '  font-family: inherit;',
  '  border: none;',
  '  outline: none;',
  '  background: none;',
  '  color: inherit;',
  '}',
  '::-webkit-scrollbar {',
  '  width: 4px;',
  '}',
  '::-webkit-scrollbar-track {',
  '  background: transparent;',
  '}',
  '::-webkit-scrollbar-thumb {',
  '  background: rgba(255,255,255,0.15);',
  '  border-radius: 2px;',
  '}',
  '::-webkit-scrollbar-thumb:hover {',
  '  background: rgba(255,255,255,0.25);',
  '}',
].join('\\n');

const styleTag = document.createElement('style');
styleTag.textContent = globalStyles;
document.head.appendChild(styleTag);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
  },
});
`;

// Fallback App.jsx when Claude didn't generate one
function buildFallbackApp(componentFiles) {
  const imports = componentFiles
    .filter(f => f !== 'App.jsx' && f !== 'main.jsx' && !f.includes('/'))
    .map(f => {
      const name = f.replace('.jsx', '');
      return `import ${name} from './components/${name}.jsx';`;
    })
    .join('\n');

  const usages = componentFiles
    .filter(f => f !== 'App.jsx' && f !== 'main.jsx' && !f.includes('/'))
    .map(f => `      <${f.replace('.jsx', '')} />`)
    .join('\n');

  return `import React from 'react';
${imports}

const App = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0D0D0D',
      color: '#FFFFFF',
      fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", sans-serif',
      fontWeight: '300',
      overflow: 'hidden',
    }}>
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
 * @param {string} outputDir  — destination path
 * @param {object} apiConfig  — resolved API config (packages, headTags)
 * @returns {Promise<string[]>} list of written file paths
 */
function isValidComponent(code) {
  return code.includes('export default') && code.includes('import') && code.length > 80;
}

function buildStubComponent(name) {
  const componentName = name.replace(/\.jsx?$/, '');
  return `import React from 'react';

const ${componentName} = ({ style: overrideStyle, children }) => {
  return (
    <div style={{
      boxSizing: 'border-box',
      fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", sans-serif',
      ...overrideStyle,
    }}>
      {children}
    </div>
  );
};

export default ${componentName};
`;
}

function collectImports(code) {
  const matches = code.matchAll(/from\s+['"]\.\/(?:components\/)?(\w+)\.jsx?['"]/g);
  return [...matches].map(m => m[1]);
}

export async function writeOutput(generatedFiles, outputDir, apiConfig = {}) {
  // Fix broken stubs: replace files without valid exports
  for (const [filename, code] of generatedFiles) {
    if (filename.endsWith('.jsx') && !isValidComponent(code)) {
      const name = filename.replace(/\.jsx$/, '').split('/').pop();
      generatedFiles.set(filename, buildStubComponent(name));
    }
  }

  // Fix missing files: if a component imports Foo.jsx but it doesn't exist, generate it
  const allNames = new Set([...generatedFiles.keys()].map(f => f.replace(/\.jsx?$/, '').split('/').pop()));
  for (const [, code] of [...generatedFiles.entries()]) {
    for (const imported of collectImports(code)) {
      if (!allNames.has(imported)) {
        generatedFiles.set(`${imported}.jsx`, buildStubComponent(imported));
        allNames.add(imported);
      }
    }
  }

  // Clean and recreate output dir
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(join(outputDir, 'src', 'components'), { recursive: true });

  const written = [];

  // Vite scaffolding — dynamic package.json and HTML head
  const indexHtml   = buildIndexHtml(apiConfig.headTags || []);
  const packageJson = buildPackageJson(apiConfig.packages || {});

  await writeFile(join(outputDir, 'index.html'),     indexHtml,   'utf-8');
  await writeFile(join(outputDir, 'vite.config.js'),  VITE_CONFIG, 'utf-8');
  await writeFile(join(outputDir, 'package.json'),    packageJson, 'utf-8');
  written.push('index.html', 'vite.config.js', 'package.json');

  // Separate App/main from other files
  const fileEntries = [...generatedFiles.entries()];
  const appFile   = fileEntries.find(([f]) => f === 'App.jsx');
  const mainFile  = fileEntries.find(([f]) => f === 'main.jsx');
  const otherFiles = fileEntries.filter(([f]) => f !== 'App.jsx' && f !== 'main.jsx');

  // Track which filenames are flat (go to components/) vs have paths
  const componentFileNames = new Set();

  // Write component, service, hook, and context files
  for (const [filename, code] of otherFiles) {
    let dest;
    if (filename.includes('/')) {
      // Subdirectory path: services/foo.js, hooks/useBar.js, context/Ctx.jsx
      dest = join(outputDir, 'src', filename);
    } else {
      // Flat file → components directory
      dest = join(outputDir, 'src', 'components', filename);
      componentFileNames.add(filename.replace(/\.jsx?$/, ''));
    }

    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, code, 'utf-8');
    written.push(`src/${filename.includes('/') ? filename : 'components/' + filename}`);
  }

  // Write or generate App.jsx
  const appCode = appFile
    ? appFile[1]
    : buildFallbackApp(otherFiles.map(([f]) => f));

  // Fix import paths: only rewrite imports for files in components/
  const fixedApp = appCode.replace(
    /from ['"]\.\/(\w+)(\.jsx?)['"]/g,
    (match, name, ext) => {
      if (componentFileNames.has(name)) {
        return `from './components/${name}${ext}'`;
      }
      return match;
    },
  );
  await writeFile(join(outputDir, 'src', 'App.jsx'), fixedApp, 'utf-8');
  written.push('src/App.jsx');

  // Always use our own main.jsx — Claude's version often breaks the entry point
  await writeFile(join(outputDir, 'src', 'main.jsx'), MAIN_JSX, 'utf-8');
  written.push('src/main.jsx');

  return written;
}
