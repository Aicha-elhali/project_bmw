/**
 * API Registry — Smart API Selection for BMW iDrive Navigation
 *
 * Automatically detects which APIs and libraries to include
 * based on component types found in the Figma wireframe.
 * All APIs are free and require no API keys.
 */

// ---------------------------------------------------------------------------
// Registry entries — each maps one or more component types to an API/library
// ---------------------------------------------------------------------------

const REGISTRY = [
  // ── Interactive Map ─────────────────────────────────────────────────────
  {
    types: ['map'],
    serviceId: 'leaflet-map',
    label: 'Interactive Map (Leaflet + CartoDB Dark)',
    npmPackages: { leaflet: '^1.9.4', 'react-leaflet': '^4.2.1' },
    headTags: [
      '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />',
    ],
    promptInstructions: `### Interactive Map (Leaflet + OpenStreetMap)

**Libraries**: \`react-leaflet\` (MapContainer, TileLayer, Marker, Polyline, useMap) and \`leaflet\`

**Setup**:
\`\`\`jsx
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
\`\`\`

**Dark Tile URL** (CartoDB Dark Matter — free, no API key):
\`\`\`
https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
\`\`\`
Attribution: \`&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>\`

**Default center**: Munich \`[48.1351, 11.5820]\`, zoom \`13\`

**CRITICAL — Custom markers** (default Leaflet markers break with Vite bundling). Use L.divIcon:
\`\`\`jsx
const bmwMarker = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;background:#1C69D4;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});
\`\`\`

**Dark theme overrides** — inject via a <style> tag in the Map component:
\`\`\`css
.leaflet-container { background: #0A0A0A; }
.leaflet-control-zoom { display: none; }
.leaflet-control-attribution { background: rgba(13,13,13,0.8) !important; color: rgba(255,255,255,0.5) !important; font-size: 0.625rem !important; }
.leaflet-control-attribution a { color: rgba(255,255,255,0.5) !important; }
\`\`\`

**Map container**: \`style={{ width: '100%', height: '100%' }}\`, fill parent with \`flex: 1\`.
**Route overlay**: \`<Polyline positions={routeCoords} pathOptions={{ color: '#4A90D9', weight: 5, opacity: 0.8 }} />\`
**Quick actions** (zoom +/−, compass): position absolute within the map wrapper, right side.`,
  },

  // ── Address / POI Search ────────────────────────────────────────────────
  {
    types: ['searchBar'],
    serviceId: 'nominatim-geocoding',
    label: 'Address Search (Nominatim Geocoding)',
    npmPackages: {},
    headTags: [],
    promptInstructions: `### Address Search (Nominatim Geocoding)

**Endpoint**: \`https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=5&addressdetails=1\`

**Headers**: Must include \`{ 'User-Agent': 'BMWiDrivePrototype/1.0' }\`.

**Rate limit**: Max 1 request/second. Implement debounced search (400ms after last keystroke).

**Response format**:
\`\`\`json
[{ "display_name": "Leopoldstraße 1, München", "lat": "48.1551", "lon": "11.5804", "type": "house" }]
\`\`\`

**Implementation** — create a custom hook:
\`\`\`
// FILE: hooks/useGeocoding.js
- Takes a search query string
- Returns { results: Array<{name, lat, lon}>, loading: boolean, error: string|null }
- Debounces API calls by 400ms
- Only fires when query.length >= 3
- Uses AbortController to cancel in-flight requests when query changes
\`\`\`

**In SearchBar component**: Show dropdown results below the input when results are available. Each result is a clickable row (min-height 3rem). Selecting a result calls setDestination from NavigationContext.`,
  },

  // ── Route Calculation ───────────────────────────────────────────────────
  {
    types: ['routeInfo', 'turnIndicator', 'speedLimit'],
    serviceId: 'osrm-routing',
    label: 'Route Calculation (OSRM)',
    npmPackages: {},
    headTags: [],
    promptInstructions: `### Route Calculation (OSRM — Open Source Routing Machine)

**Endpoint**:
\`\`\`
https://router.project-osrm.org/route/v1/driving/{startLon},{startLat};{endLon},{endLat}?overview=full&steps=true&geometries=geojson
\`\`\`

**Response format** (key fields):
\`\`\`json
{
  "routes": [{
    "geometry": { "type": "LineString", "coordinates": [[lon,lat], ...] },
    "duration": 1234.5,
    "distance": 15234.2,
    "legs": [{
      "steps": [{
        "maneuver": { "type": "turn", "modifier": "left", "location": [lon,lat] },
        "name": "Leopoldstraße",
        "distance": 423.1,
        "duration": 52.3
      }]
    }]
  }]
}
\`\`\`

**Maneuver types**: \`depart\`, \`arrive\`, \`turn\` (+ modifier: left/right/sharp left/sharp right/straight), \`merge\`, \`fork\`, \`roundabout\`, \`new name\`, \`continue\`

**Maneuver icons** (Unicode):
- turn left: ↰   turn right: ↱   sharp left: ⮢   sharp right: ⮣
- straight: ↑   u-turn: ↩   merge: ⤨   roundabout: ↻   arrive: ●   depart: ▶

**Implementation** — create a custom hook:
\`\`\`
// FILE: hooks/useRouting.js
- Takes origin {lat, lon} and destination {lat, lon}
- Returns { route: { coordinates, distance, duration, steps }, loading, error }
- Coordinates are [lat, lon] pairs (convert from OSRM [lon, lat])
- Format duration as "X h Y min", distance as "X,Y km"
\`\`\`

**For routeInfo**: Show total distance, ETA (current time + duration), remaining time.
**For turnIndicator**: Show the NEXT step's maneuver icon, street name, distance to turn.
**For speedLimit**: Simulate by road class — Autobahn: 130, Bundesstraße: 100, Stadt: 50.
**On map**: Pass route coordinates to Map as a Polyline.`,
  },

  // ── Media Player ────────────────────────────────────────────────────────
  {
    types: ['mediaPlayer'],
    serviceId: 'web-audio',
    label: 'Media Player (Web Audio API)',
    npmPackages: {},
    headTags: [],
    promptInstructions: `### Media Player (Web Audio API)

**No external API** — uses the browser's built-in HTML5 Audio.

**Implementation** — create a custom hook:
\`\`\`
// FILE: hooks/useMediaPlayer.js
- Manages a playlist of tracks (use sample data below)
- Returns { currentTrack, isPlaying, progress, duration, play, pause, next, prev, seek }
- progress and duration are in seconds
- Simulates playback: setInterval increments progress each second when playing
- Handle track end → auto-advance to next track
\`\`\`

**Sample playlist**:
\`\`\`javascript
const PLAYLIST = [
  { id: 1, title: 'Nachtfahrt', artist: 'Kraftwerk', album: 'Autobahn', duration: 234 },
  { id: 2, title: 'Autobahn', artist: 'Kraftwerk', album: 'Autobahn', duration: 1326 },
  { id: 3, title: 'Bayern 3 Live', artist: 'Radio', album: 'FM 99.9', duration: 0 },
  { id: 4, title: 'Blue Monday', artist: 'New Order', album: 'Power', duration: 289 },
  { id: 5, title: 'Trans Europa Express', artist: 'Kraftwerk', album: 'TEE', duration: 402 },
];
\`\`\`

**Display**: Album art placeholder (dark square with ♪ symbol), track title (heading2), artist (textSecondary), progress bar (BMW Blue fill on dark track), controls (◂◂ ▶/‖ ▸▸), volume indicator (CSS bars). NO EMOJI — use geometric Unicode only.
**Simulate progress**: setInterval increments progress every second when isPlaying is true.`,
  },

  // ── Climate Control ─────────────────────────────────────────────────────
  {
    types: ['climateControl'],
    serviceId: 'climate-sim',
    label: 'Climate Control (Simulated)',
    npmPackages: {},
    headTags: [],
    promptInstructions: `### Climate Control (Simulated State)

**No external API** — pure React state.

**State model**:
\`\`\`javascript
{
  driverTemp: 22.0,      // 16.0 – 28.0 °C, step 0.5
  passengerTemp: 22.0,
  fanSpeed: 3,           // 0 (off) – 5 (max)
  acOn: true,
  seatHeatingDriver: 0,  // 0 (off), 1, 2, 3
  seatHeatingPassenger: 0,
  autoMode: true,
}
\`\`\`

**Controls**:
- Temperature: Large number (display typography, 3rem) with △ ▽ buttons
- Fan speed: 5 horizontal bars, filled bars = active level
- AC button: ✳ icon (or CSS snowflake shape), BMW Blue when active, muted when off
- Seat heating: 3-level icon indicator
- AUTO button: text button, BMW Blue when active

**Layout**: Horizontal — driver zone | center controls (fan, AC, AUTO) | passenger zone.
**Touch targets**: Temperature buttons min 3.75rem.`,
  },

  // ── Vehicle Info ────────────────────────────────────────────────────────
  {
    types: ['vehicleInfo'],
    serviceId: 'vehicle-sim',
    label: 'Vehicle Data (Simulated)',
    npmPackages: {},
    headTags: [],
    promptInstructions: `### Vehicle Info (Simulated Data)

**No external API** — simulated values that drift realistically.

**Implementation** — create a custom hook:
\`\`\`
// FILE: hooks/useVehicleData.js
- Returns { range, fuel, speed, odometer, avgConsumption, outsideTemp }
- range: starts at 487 km, decreases ~0.1 km per 3s
- fuel: starts at 78%, decreases proportionally
- speed: oscillates 0-65 km/h (city driving), changes every 2-5s
- odometer: 23847 km, increases with speed
- avgConsumption: 7.2 L/100km, slight random drift
- outsideTemp: 18°C, stable ±0.5° drift every 30s
- Uses setInterval, cleans up on unmount
\`\`\`

**Display**: Compact row — ■ 78% | 487 km | 7.2 L/100km (use CSS-drawn fuel gauge icon, NO emoji)`,
  },

  // ── Status Bar ──────────────────────────────────────────────────────────
  {
    types: ['statusBar'],
    serviceId: 'status-bar',
    label: 'Status Bar (Live Clock + Simulated)',
    npmPackages: {},
    headTags: [],
    promptInstructions: `### Status Bar (Browser APIs + Simulated)

**Real-time clock** — use useState + useEffect:
\`\`\`javascript
const [time, setTime] = useState(new Date());
useEffect(() => {
  const id = setInterval(() => setTime(new Date()), 1000);
  return () => clearInterval(id);
}, []);
const timeStr = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
\`\`\`

**Simulated values**:
- Signal: 4 of 5 bars (static, draw as 5 small rects with 4 filled)
- Network: "BMW Connected" text
- Outside temperature: from useVehicleData if available, else static "18°C"

**Layout**: Row — left: BMW logo/text | center: time | right: signal + temp + connectivity`,
  },

  // ── POI Search ──────────────────────────────────────────────────────────
  {
    types: ['poiList', 'poiItem'],
    serviceId: 'overpass-poi',
    label: 'POI Search (Overpass / OpenStreetMap)',
    npmPackages: {},
    headTags: [],
    promptInstructions: `### POI Search (Overpass API / OpenStreetMap)

**Endpoint**: POST to \`https://overpass-api.de/api/interpreter\`

**Query body** (nearby POIs within 2km):
\`\`\`
[out:json][timeout:10];
node["amenity"~"fuel|parking|restaurant|cafe|fast_food|bank|pharmacy"](around:2000,{lat},{lon});
out body 20;
\`\`\`

**Response format**:
\`\`\`json
{ "elements": [{ "lat": 48.135, "lon": 11.582, "tags": { "name": "ARAL Tankstelle", "amenity": "fuel" } }] }
\`\`\`

**POI icons by amenity** (geometric Unicode or CSS-drawn, NO EMOJI): fuel ■ | parking P | restaurant ◆ | cafe ● | fast_food ▸ | bank ▣ | pharmacy ✚
Draw each icon as a styled CSS shape (colored div with border-radius, border, etc.) or use single-character geometric Unicode. Never use emoji.

**Implementation** — create a custom hook:
\`\`\`
// FILE: hooks/usePOISearch.js
- Takes (lat, lon, category?)
- Returns { pois: Array<{name, type, lat, lon, distance}>, loading, error }
- Calculate distance with Haversine formula
- Sort by distance ascending
- Format: under 1km → meters, else km with 1 decimal
\`\`\``,
  },
];

// ---------------------------------------------------------------------------
// Shared navigation context prompt — added when map + routing/search coexist
// ---------------------------------------------------------------------------

const NAVIGATION_CONTEXT_PROMPT = `### Shared Navigation Context

Create a React Context so navigation components share state:

\`\`\`
// FILE: context/NavigationContext.jsx
\`\`\`

**Provides**:
- \`position\`: { lat: 48.1351, lon: 11.5820 } (current location, default Munich)
- \`destination\`: null | { lat, lon, name }
- \`route\`: null | { coordinates, distance, duration, steps } (from OSRM)
- \`setDestination(dest)\`: sets destination and triggers route calculation
- \`clearRoute()\`: clears destination and route

**Behavior**:
- When \`destination\` changes and is not null → automatically fetch route from OSRM
- Store route result in context so Map, RouteInfo, TurnIndicator all read the same data
- Wrap the entire App in \`<NavigationProvider>\`

**Usage in components**:
\`\`\`jsx
import { useNavigation } from '../context/NavigationContext.jsx';
const { position, destination, route, setDestination } = useNavigation();
\`\`\``;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk a component tree and collect all unique types.
 */
function collectTypes(node, types = new Set()) {
  types.add(node.type);
  for (const child of node.children ?? []) collectTypes(child, types);
  return types;
}

/**
 * Resolve which APIs/libraries to include based on detected component types.
 * @param {object} componentTree — the component tree from Phase 2
 * @returns {object} { packages, headTags, promptSections, detectedServices, hasAPIs }
 */
export function resolveAPIs(componentTree) {
  const types = collectTypes(componentTree);

  // Match registry entries — deduplicate by serviceId
  const matched = new Map();
  for (const entry of REGISTRY) {
    if (entry.types.some(t => types.has(t)) && !matched.has(entry.serviceId)) {
      matched.set(entry.serviceId, entry);
    }
  }

  // Merge results
  const packages = {};
  const headTags = [];
  const promptSections = [];
  const detectedServices = [];

  for (const entry of matched.values()) {
    Object.assign(packages, entry.npmPackages);
    headTags.push(...entry.headTags);
    promptSections.push(entry.promptInstructions);
    detectedServices.push(entry.label);
  }

  // Add shared navigation context when map coexists with routing or search
  const hasMap     = matched.has('leaflet-map');
  const hasRouting = matched.has('osrm-routing');
  const hasSearch  = matched.has('nominatim-geocoding');

  if (hasMap && (hasRouting || hasSearch)) {
    promptSections.unshift(NAVIGATION_CONTEXT_PROMPT);
    detectedServices.unshift('Shared Navigation Context');
  }

  return {
    packages,
    headTags,
    promptSections,
    detectedServices,
    hasAPIs: matched.size > 0,
  };
}
