/**
 * Pre-built Backend Module Registry
 *
 * Maps screen contexts to backend service modules that get copied
 * into every prototype. Replaces the Backend Agent for standard services.
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const BACKEND_DIR = resolve(__dirname);

export const MODULE_REGISTRY = {
  navigation: {
    serviceId: 'navigation',
    label: 'Navigation (Routing + Geocoding)',
    files: {
      'navigation/NavigationContext.jsx': 'context/NavigationContext.jsx',
      'navigation/navigationService.js': 'services/navigationService.js',
      'navigation/useGeocoding.js': 'hooks/useGeocoding.js',
      'navigation/useRouting.js': 'hooks/useRouting.js',
    },
    interfaceFragment: 'navigation/INTERFACE.fragment.md',
    contextProvider: {
      import: "import { NavigationProvider } from './context/NavigationContext.jsx';",
      wrapper: 'NavigationProvider',
    },
    npmPackages: {},
    envVars: {},
    headTags: [],
  },
  map: {
    serviceId: 'map',
    label: 'Interactive Map (MapLibre + MapTiler)',
    files: {
      'map/mapService.js': 'services/mapService.js',
      'map/useMapConfig.js': 'hooks/useMapConfig.js',
    },
    interfaceFragment: 'map/INTERFACE.fragment.md',
    contextProvider: null,
    npmPackages: { 'maplibre-gl': '^4.7.1', 'react-map-gl': '^7.1.7' },
    envVars: { VITE_MAPTILER_KEY: 'MapTiler API key (free: maptiler.com/cloud)' },
    headTags: [
      '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" crossorigin="" />',
    ],
  },
  media: {
    serviceId: 'media',
    label: 'Media (Spotify + Radio)',
    files: {
      'media/MediaContext.jsx': 'context/MediaContext.jsx',
      'media/spotifyService.js': 'services/spotifyService.js',
      'media/radioService.js': 'services/radioService.js',
      'media/useSpotify.js': 'hooks/useSpotify.js',
      'media/useRadio.js': 'hooks/useRadio.js',
    },
    interfaceFragment: 'media/INTERFACE.fragment.md',
    contextProvider: {
      import: "import { MediaProvider } from './context/MediaContext.jsx';",
      wrapper: 'MediaProvider',
    },
    npmPackages: {},
    envVars: {
      VITE_SPOTIFY_CLIENT_ID: 'Spotify App Client ID',
      VITE_SPOTIFY_CLIENT_SECRET: 'Spotify App Client Secret',
    },
    headTags: [],
  },
  weather: {
    serviceId: 'weather',
    label: 'Weather (Open-Meteo)',
    files: {
      'weather/weatherService.js': 'services/weatherService.js',
      'weather/useWeather.js': 'hooks/useWeather.js',
    },
    interfaceFragment: 'weather/INTERFACE.fragment.md',
    contextProvider: null,
    npmPackages: {},
    envVars: {},
    headTags: [],
  },
  vehicle: {
    serviceId: 'vehicle',
    label: 'Vehicle Data (Simulated)',
    files: {
      'vehicle/vehicleService.js': 'services/vehicleService.js',
      'vehicle/useVehicleData.js': 'hooks/useVehicleData.js',
    },
    interfaceFragment: 'vehicle/INTERFACE.fragment.md',
    contextProvider: null,
    npmPackages: {},
    envVars: {},
    headTags: [],
  },
  climate: {
    serviceId: 'climate',
    label: 'Climate Control (Simulated)',
    files: {
      'climate/useClimateControl.js': 'hooks/useClimateControl.js',
    },
    interfaceFragment: 'climate/INTERFACE.fragment.md',
    contextProvider: null,
    npmPackages: {},
    envVars: {},
    headTags: [],
  },
  charging: {
    serviceId: 'charging',
    label: 'EV Charging (Open Charge Map)',
    files: {
      'charging/chargingService.js': 'services/chargingService.js',
      'charging/useChargingStations.js': 'hooks/useChargingStations.js',
    },
    interfaceFragment: 'charging/INTERFACE.fragment.md',
    contextProvider: null,
    npmPackages: {},
    envVars: {},
    headTags: [],
  },
  contacts: {
    serviceId: 'contacts',
    label: 'Contacts & Phone (Simulated)',
    files: {
      'contacts/useContacts.js': 'hooks/useContacts.js',
    },
    interfaceFragment: 'contacts/INTERFACE.fragment.md',
    contextProvider: null,
    npmPackages: {},
    envVars: {},
    headTags: [],
  },
  statusbar: {
    serviceId: 'statusbar',
    label: 'Status Bar (Clock + Connectivity)',
    files: {
      'statusbar/useStatusBar.js': 'hooks/useStatusBar.js',
    },
    interfaceFragment: 'statusbar/INTERFACE.fragment.md',
    contextProvider: null,
    npmPackages: {},
    envVars: {},
    headTags: [],
  },
};

export const CONTEXT_MODULE_MAP = {
  navigation: ['navigation', 'map', 'weather', 'vehicle', 'statusbar', 'charging'],
  media:      ['media', 'navigation', 'weather', 'vehicle', 'statusbar'],
  phone:      ['contacts', 'navigation', 'weather', 'vehicle', 'statusbar'],
  climate:    ['climate', 'weather', 'vehicle', 'statusbar'],
  settings:   ['vehicle', 'climate', 'statusbar'],
  charging:   ['charging', 'navigation', 'map', 'weather', 'vehicle', 'statusbar'],
  home:       ['navigation', 'media', 'weather', 'vehicle', 'statusbar'],
  apps:       ['vehicle', 'statusbar'],
  generic:    ['navigation', 'weather', 'vehicle', 'statusbar'],
};

/**
 * Resolve which pre-built backend modules to include.
 * @param {string} screenContext — from classifyFrame()
 * @returns {{ modules: object[], contextProviders: object[], npmPackages: object, envVars: object, headTags: string[] }}
 */
export function resolveModules(screenContext) {
  const moduleIds = CONTEXT_MODULE_MAP[screenContext] || CONTEXT_MODULE_MAP.generic;
  const seen = new Set();
  const modules = [];
  const contextProviders = [];
  const npmPackages = {};
  const envVars = {};
  const headTags = [];

  for (const id of moduleIds) {
    if (seen.has(id)) continue;
    seen.add(id);

    const mod = MODULE_REGISTRY[id];
    if (!mod) continue;

    modules.push(mod);
    Object.assign(npmPackages, mod.npmPackages);
    Object.assign(envVars, mod.envVars);
    headTags.push(...mod.headTags);

    if (mod.contextProvider) {
      contextProviders.push(mod.contextProvider);
    }
  }

  return { modules, contextProviders, npmPackages, envVars, headTags };
}

/**
 * Assemble INTERFACE.md from preamble + module fragments.
 * Called early in the pipeline so the Frontend Agent knows what's available.
 */
export async function assembleInterfaceDoc(resolvedModules) {
  const preamble = await readFile(join(BACKEND_DIR, '_interface.md'), 'utf-8');
  const fragments = [];

  for (const mod of resolvedModules.modules) {
    if (!mod.interfaceFragment) continue;
    try {
      const text = await readFile(join(BACKEND_DIR, mod.interfaceFragment), 'utf-8');
      fragments.push(text.trim());
    } catch {
      // fragment missing — skip silently
    }
  }

  return preamble.trim() + '\n\n' + fragments.join('\n\n') + '\n';
}

/**
 * Build a Map<destPath, ''> of all pre-built backend files.
 * Keys match the format expected by frontendPromptBuilder (e.g. 'hooks/useWeather.js').
 */
export function buildBackendFileMap(resolvedModules) {
  const map = new Map();
  for (const mod of resolvedModules.modules) {
    for (const destRel of Object.values(mod.files)) {
      map.set(destRel, '');
    }
  }
  return map;
}
