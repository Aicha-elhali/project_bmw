/**
 * Phase 5 — Output Builder (BMW HMI Design System)
 *
 * Writes the generated React components + Vite scaffolding.
 * Includes BMW HMI Design System CSS variables, icon library, and Inter font.
 * Dynamically adds npm packages and HTML head tags based on API config.
 *
 *   cd output && npm install && npm run dev
 */

import { mkdir, writeFile, rm, copyFile, readFile } from 'fs/promises';
import { join, dirname, resolve }          from 'path';
import { fileURLToPath }                   from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HMI_DIR = resolve(__dirname, '..', '..', 'BMW HMI Design System');
const HMI_ESM_DIR = resolve(__dirname, '..', 'hmi');
const BACKEND_DIR = resolve(__dirname, '..', 'backend');

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
    <title>BMW HMI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/bmw-hmi/colors_and_type.css" />${extraHead}
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: #0A1428; }
      #root { width: 100vw; height: 100vh; overflow: hidden; }
    </style>
  </head>
  <body class="bmw-root">
    <div id="root"></div>
    <script src="/bmw-hmi/icons.js"><\/script>
    <script type="module" src="/src/main.jsx"><\/script>
  </body>
</html>
`;
}

function buildPackageJson(extraDependencies = {}) {
  return JSON.stringify({
    name: 'bmw-hmi-prototype',
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

const globalStyles = [
  '@font-face {',
  "  font-family: 'BMW Type Next';",
  '  font-display: swap;',
  '  font-weight: 100 900;',
  "  src: local('BMW Type Next'),",
  "       local('BMWTypeNext'),",
  "       url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2') format('woff2');",
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
  '  text-rendering: optimizeLegibility;',
  '}',
  'body {',
  '  font-family: "BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
  '  font-weight: 400;',
  '  background-color: #0A1428;',
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
  publicDir: 'public',
});
`;

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
      backgroundColor: '#0A1428',
      color: '#FFFFFF',
      fontFamily: '"BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontWeight: '400',
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
      fontFamily: '"BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
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

/**
 * Copy BMW HMI Design System assets to output/public/bmw-hmi/
 */
async function copyHMIAssets(outputDir) {
  const publicDir = join(outputDir, 'public', 'bmw-hmi');
  await mkdir(publicDir, { recursive: true });

  const assets = [
    { src: join(HMI_DIR, 'colors_and_type.css'), dest: join(publicDir, 'colors_and_type.css') },
    { src: join(HMI_DIR, 'assets', 'icons.js'),  dest: join(publicDir, 'icons.js') },
  ];

  for (const { src, dest } of assets) {
    try {
      await copyFile(src, dest);
    } catch (e) {
      console.warn(`  ⚠  Could not copy HMI asset ${src}: ${e.message}`);
    }
  }

  const roundelDest = join(publicDir, 'bmw-roundel.png');
  try {
    await copyFile(join(HMI_DIR, 'assets', 'bmw-roundel.png'), roundelDest);
  } catch (_) {
    try {
      await copyFile(join(HMI_DIR, 'uploads', 'BMWLogo.png'), roundelDest);
    } catch (e) {
      console.warn(`  ⚠  Could not copy BMW roundel: ${e.message}`);
    }
  }

  return publicDir;
}

/**
 * Copy pre-built HMI Chrome ESM components to output/src/hmi/
 */
async function copyHMIComponents(outputDir) {
  const hmiOutDir = join(outputDir, 'src', 'hmi');
  await mkdir(hmiOutDir, { recursive: true });

  const files = ['BMWIcons.jsx', 'HMIChrome.jsx'];
  for (const file of files) {
    try {
      await copyFile(join(HMI_ESM_DIR, file), join(hmiOutDir, file));
    } catch (e) {
      console.warn(`  ⚠  Could not copy HMI component ${file}: ${e.message}`);
    }
  }
  return files.map(f => `src/hmi/${f}`);
}

/**
 * Copy pre-built backend service modules to output/src/
 */
async function copyBackendServices(outputDir, resolvedModules) {
  if (!resolvedModules?.modules?.length) return { written: [], interfaceDoc: '' };

  const written = [];
  for (const mod of resolvedModules.modules) {
    for (const [srcRel, destRel] of Object.entries(mod.files)) {
      const src = join(BACKEND_DIR, srcRel);
      const dest = join(outputDir, 'src', destRel);
      await mkdir(dirname(dest), { recursive: true });
      try {
        await copyFile(src, dest);
        written.push(`src/${destRel}`);
      } catch (e) {
        console.warn(`  ⚠  Could not copy backend module ${srcRel}: ${e.message}`);
      }
    }
  }

  let interfaceDoc = '';
  try {
    interfaceDoc = await readFile(join(BACKEND_DIR, '_interface.md'), 'utf-8');
  } catch { interfaceDoc = '# INTERFACE\n'; }

  for (const mod of resolvedModules.modules) {
    try {
      const fragment = await readFile(join(BACKEND_DIR, mod.interfaceFragment), 'utf-8');
      interfaceDoc += '\n' + fragment;
    } catch {}
  }

  await writeFile(join(outputDir, 'src', 'INTERFACE.md'), interfaceDoc, 'utf-8');
  written.push('src/INTERFACE.md');

  return { written, interfaceDoc };
}

/**
 * Write all generated files to the output directory.
 * @param {Map<string, string>} frontendFiles — filename → code (components, App.jsx)
 * @param {string} outputDir  — destination path
 * @param {object} apiConfig  — resolved API config (packages, headTags)
 * @param {object} [extras]
 * @param {Map<string, string>} [extras.backendFiles] — services/hooks/context files
 * @param {string} [extras.interfaceDoc] — INTERFACE.md content
 * @param {object} [extras.resolvedModules] — pre-built backend modules from resolveModules()
 * @returns {Promise<string[]>} list of written file paths
 */
export async function writeOutput(frontendFiles, outputDir, apiConfig = {}, extras = {}) {
  const { backendFiles, interfaceDoc, resolvedModules } = extras;

  if (resolvedModules) {
    Object.assign(apiConfig.packages || (apiConfig.packages = {}), resolvedModules.npmPackages || {});
    Object.assign(apiConfig.envVars || (apiConfig.envVars = {}), resolvedModules.envVars || {});
    (apiConfig.headTags || (apiConfig.headTags = [])).push(...(resolvedModules.headTags || []));
  }

  // Normalize keys: strip all src/ prefixes to prevent double-nesting (output/src/src/)
  function normalizeKey(key) {
    let k = key;
    while (k.startsWith('src/')) k = k.slice(4);
    if (k.startsWith('components/App.jsx')) k = 'App.jsx';
    return k;
  }

  const normalizedFrontend = new Map();
  for (const [f, code] of frontendFiles) {
    const normalized = normalizeKey(f);
    if (f !== normalized) console.log(`  [builder] normalized key: "${f}" → "${normalized}"`);
    normalizedFrontend.set(normalized, code);
  }
  console.log(`  [builder] frontend keys: ${[...normalizedFrontend.keys()].join(', ')}`);

  // Merge backend + frontend into one map for validation
  const generatedFiles = new Map();
  if (backendFiles) {
    for (const [f, code] of backendFiles) generatedFiles.set(normalizeKey(f), code);
  }
  for (const [f, code] of normalizedFrontend) generatedFiles.set(f, code);

  for (const [filename, code] of generatedFiles) {
    if (filename.endsWith('.jsx') && !isValidComponent(code)) {
      const name = filename.replace(/\.jsx$/, '').split('/').pop();
      generatedFiles.set(filename, buildStubComponent(name));
    }
  }

  const allNames = new Set([...generatedFiles.keys()].map(f => f.replace(/\.jsx?$/, '').split('/').pop()));
  for (const [, code] of [...generatedFiles.entries()]) {
    for (const imported of collectImports(code)) {
      if (!allNames.has(imported)) {
        generatedFiles.set(`${imported}.jsx`, buildStubComponent(imported));
        allNames.add(imported);
      }
    }
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(join(outputDir, 'src', 'components'), { recursive: true });

  const written = [];

  // Copy BMW HMI Design System assets to public/
  await copyHMIAssets(outputDir);
  written.push('public/bmw-hmi/colors_and_type.css', 'public/bmw-hmi/icons.js');

  // Copy pre-built HMI Chrome components to src/hmi/
  const hmiFiles = await copyHMIComponents(outputDir);
  written.push(...hmiFiles);

  // Copy pre-built backend service modules
  const backendCopy = await copyBackendServices(outputDir, resolvedModules);
  written.push(...backendCopy.written);
  const assembledInterface = backendCopy.interfaceDoc || interfaceDoc;

  // Vite scaffolding
  const indexHtml   = buildIndexHtml(apiConfig.headTags || []);
  const packageJson = buildPackageJson(apiConfig.packages || {});

  await writeFile(join(outputDir, 'index.html'),     indexHtml,   'utf-8');
  await writeFile(join(outputDir, 'vite.config.js'),  VITE_CONFIG, 'utf-8');
  await writeFile(join(outputDir, 'package.json'),    packageJson, 'utf-8');
  written.push('index.html', 'vite.config.js', 'package.json');

  // Write backend files (services/, hooks/, context/)
  if (backendFiles && backendFiles.size > 0) {
    for (const [rawFilename, code] of backendFiles) {
      const filename = normalizeKey(rawFilename);
      const dest = join(outputDir, 'src', filename);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, code, 'utf-8');
      written.push(`src/${filename}`);
    }
  }

  // Write INTERFACE.md (append Backend Agent additions to pre-built if both exist)
  if (interfaceDoc && assembledInterface && assembledInterface !== interfaceDoc) {
    const merged = assembledInterface + '\n\n---\n\n## Custom (Backend Agent)\n\n' + interfaceDoc;
    await writeFile(join(outputDir, 'src', 'INTERFACE.md'), merged, 'utf-8');
  } else if (interfaceDoc && !assembledInterface) {
    await writeFile(join(outputDir, 'src', 'INTERFACE.md'), interfaceDoc, 'utf-8');
    written.push('src/INTERFACE.md');
  }

  // Separate App/main from other frontend files
  const fileEntries = [...normalizedFrontend.entries()];
  const appFile   = fileEntries.find(([f]) => f === 'App.jsx' || f === 'components/App.jsx');
  const otherFiles = fileEntries.filter(([f]) => f !== 'App.jsx' && f !== 'main.jsx' && f !== 'components/App.jsx');
  console.log(`  [builder] appFile found: ${appFile ? appFile[0] + ' (' + appFile[1].length + ' chars)' : 'NO — using fallback'}`);

  const componentFileNames = new Set();

  for (const [filename, code] of otherFiles) {
    let dest;
    if (filename.includes('/')) {
      dest = join(outputDir, 'src', filename);
    } else {
      dest = join(outputDir, 'src', 'components', filename);
      componentFileNames.add(filename.replace(/\.jsx?$/, ''));
    }

    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, code, 'utf-8');
    written.push(`src/${filename.includes('/') ? filename : 'components/' + filename}`);
  }

  const appCode = appFile
    ? appFile[1]
    : buildFallbackApp(otherFiles.map(([f]) => f));

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

  await writeFile(join(outputDir, 'src', 'main.jsx'), MAIN_JSX, 'utf-8');
  written.push('src/main.jsx');

  // Write .env.example and .env if APIs need environment variables
  const envVars = apiConfig.envVars || {};
  if (Object.keys(envVars).length > 0) {
    const envExample = Object.entries(envVars)
      .map(([key, desc]) => `# ${desc}\n${key}=`)
      .join('\n\n') + '\n';
    await writeFile(join(outputDir, '.env.example'), envExample, 'utf-8');
    written.push('.env.example');

    const envDefaults = Object.keys(envVars)
      .map(key => `${key}=`)
      .join('\n') + '\n';
    await writeFile(join(outputDir, '.env'), envDefaults, 'utf-8');
    written.push('.env');
  }

  return written;
}
