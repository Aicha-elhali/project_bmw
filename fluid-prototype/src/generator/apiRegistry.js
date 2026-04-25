/**
 * API Registry — Smart API Selection for BMW HMI Prototypes
 *
 * Automatically detects which APIs and libraries to include
 * based on component types found in the Figma wireframe.
 *
 * APIs:
 *   Map:         MapLibre GL JS + MapTiler Vector Tiles (Dark-Style)
 *   Geocoding:   Nominatim (OpenStreetMap)
 *   Routing:     OSRM (Open Source Routing Machine)
 *   Music:       Spotify Web API (Catalog, Artwork, 30s Previews)
 *   Radio:       Radio Browser API
 *   Podcasts:    Podcast Index API
 *   EV-Charging: Open Charge Map + TomTom Live-Verfügbarkeit
 *   Weather:     Open-Meteo
 *
 * Environment variables (APIs mit Auth):
 *   VITE_MAPTILER_KEY             — MapTiler free key (maptiler.com/cloud)
 *   VITE_SPOTIFY_CLIENT_ID        — Spotify App Client ID
 *   VITE_SPOTIFY_CLIENT_SECRET    — Spotify App Client Secret
 *   VITE_TOMTOM_KEY               — TomTom (EV-Charging Verfügbarkeit)
 *   VITE_PODCAST_INDEX_KEY        — Podcast Index API Key
 *   VITE_PODCAST_INDEX_SECRET     — Podcast Index API Secret
 */

// ---------------------------------------------------------------------------
// Registry entries
// ---------------------------------------------------------------------------

const REGISTRY = [
  // ── Interactive Map (MapLibre GL JS + MapTiler) ────────────────────────
  {
    types: ['map'],
    serviceId: 'maplibre-map',
    label: 'Interactive Map (MapLibre GL JS + MapTiler Dark)',
    npmPackages: { 'maplibre-gl': '^4.7.1', 'react-map-gl': '^7.1.7' },
    envVars: { VITE_MAPTILER_KEY: 'MapTiler API key (free: maptiler.com/cloud)' },
    headTags: [
      '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" crossorigin="" />',
    ],
    promptInstructions: `### Interactive Map (MapLibre GL JS + MapTiler Vector Tiles)

**Libraries**: \`react-map-gl\` (Map, Marker, Source, Layer, NavigationControl) with \`maplibre-gl\` backend.

**Setup**:
\`\`\`jsx
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
\`\`\`

**MapTiler Dark Style** (free tier — key via env):
\`\`\`js
const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? \`https://api.maptiler.com/maps/dataviz-dark/style.json?key=\${import.meta.env.VITE_MAPTILER_KEY}\`
  : 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
\`\`\`

**Fallback ohne Key**: Wenn kein VITE_MAPTILER_KEY gesetzt ist, verwende raster tiles als Fallback:
\`\`\`jsx
// Raster fallback (kein Vector-Styling, aber funktioniert ohne Key)
<Map
  initialViewState={{ longitude: 11.582, latitude: 48.1351, zoom: 13 }}
  style={{ width: '100%', height: '100%' }}
  mapStyle={{
    version: 8,
    sources: { 'carto-dark': { type: 'raster', tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'], tileSize: 256 } },
    layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }],
  }}
/>
\`\`\`

**Map component mit MapTiler** (bevorzugt):
\`\`\`jsx
<Map
  initialViewState={{ longitude: 11.582, latitude: 48.1351, zoom: 13, pitch: 45 }}
  style={{ width: '100%', height: '100%' }}
  mapStyle={\`https://api.maptiler.com/maps/dataviz-dark/style.json?key=\${import.meta.env.VITE_MAPTILER_KEY}\`}
/>
\`\`\`

**Default**: Munich [48.1351, 11.5820], zoom 13, pitch 45 (3D Perspektive)

**Custom marker** (BMW Blue dot):
\`\`\`jsx
<Marker longitude={11.582} latitude={48.1351}>
  <div style={{
    width: 20, height: 20,
    background: '#1C69D4',
    border: '2px solid #fff',
    borderRadius: '50%',
    boxShadow: '0 0 12px rgba(28,105,212,0.6)',
  }} />
</Marker>
\`\`\`

**Route line** (GeoJSON Source + Layer):
\`\`\`jsx
<Source id="route" type="geojson" data={{
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: routeCoords }
}}>
  <Layer id="route-line" type="line" paint={{
    'line-color': '#5BA3FF',
    'line-width': 5,
    'line-opacity': 0.8,
  }} />
</Source>
\`\`\`

**Dark theme overrides** (inject via <style> in Map component):
\`\`\`css
.maplibregl-map { background: #0F1A2C; }
.maplibregl-ctrl-group { display: none; }
.maplibregl-ctrl-attrib { background: rgba(10,20,40,0.8) !important; color: rgba(255,255,255,0.4) !important; font-size: 0.625rem !important; }
.maplibregl-ctrl-attrib a { color: rgba(255,255,255,0.4) !important; }
\`\`\`

**Map container**: \`style={{ width: '100%', height: '100%' }}\`, fill parent with \`flex: 1\`, position relative for floating BMW controls.
**Quick actions** (zoom +/−, compass): position absolute within the map wrapper, right side.`,
  },

  // ── Address / POI Search (Nominatim) ───────────────────────────────────
  {
    types: ['searchBar'],
    serviceId: 'nominatim-geocoding',
    label: 'Address Search (Nominatim Geocoding)',
    npmPackages: {},
    envVars: {},
    headTags: [],
    promptInstructions: `### Address Search (Nominatim Geocoding)

**Endpoint**: \`https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=5&addressdetails=1\`

**Headers**: Must include \`{ 'User-Agent': 'BMWiDrivePrototype/1.0' }\`.

**Rate limit**: Max 1 request/second. Implement debounced search (400ms after last keystroke).

**Response format**:
\`\`\`json
[{ "display_name": "Leopoldstraße 1, München", "lat": "48.1551", "lon": "11.5804", "type": "house" }]
\`\`\`

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/useGeocoding.js
- Takes a search query string
- Returns { results: Array<{name, lat, lon}>, loading: boolean, error: string|null }
- Debounces API calls by 400ms
- Only fires when query.length >= 3
- Uses AbortController to cancel in-flight requests when query changes
\`\`\`

**In SearchBar component**: Show dropdown results below the input when results are available. Each result is a clickable row (min-height 64px). Selecting a result calls setDestination from NavigationContext.`,
  },

  // ── Route Calculation (OSRM) ───────────────────────────────────────────
  {
    types: ['routeInfo', 'turnIndicator', 'speedLimit'],
    serviceId: 'osrm-routing',
    label: 'Route Calculation (OSRM)',
    npmPackages: {},
    envVars: {},
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
- turn left: \\u21B0   turn right: \\u21B1   sharp left: \\u2BA2   sharp right: \\u2BA3
- straight: \\u2191   u-turn: \\u21A9   merge: \\u2928   roundabout: \\u21BB   arrive: \\u25CF   depart: \\u25B6

**Implementation** — custom hook:
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
**On map**: Pass route coordinates to Map as a GeoJSON Source + Layer.`,
  },

  // ── Music (Spotify Web API) ────────────────────────────────────────────
  {
    types: ['mediaPlayer'],
    serviceId: 'spotify-music',
    label: 'Musik (Spotify Web API — Catalog, Artwork, 30s Previews)',
    npmPackages: {},
    envVars: {
      VITE_SPOTIFY_CLIENT_ID: 'Spotify App Client ID (developer.spotify.com)',
      VITE_SPOTIFY_CLIENT_SECRET: 'Spotify App Client Secret',
    },
    headTags: [],
    promptInstructions: `### Musik (Spotify Web API)

**Auth**: Client Credentials Flow (Prototype-only, client-side):
\`\`\`js
// FILE: services/spotify.js
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

let tokenCache = { token: null, expiresAt: 0 };

export async function getSpotifyToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  if (!CLIENT_ID || !CLIENT_SECRET) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET),
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

export async function spotifyFetch(endpoint) {
  const token = await getSpotifyToken();
  if (!token) return null;
  const res = await fetch(\`https://api.spotify.com/v1\${endpoint}\`, {
    headers: { 'Authorization': \`Bearer \${token}\` },
  });
  return res.json();
}
\`\`\`

**Endpoints**:
- Suche: \`/search?q={query}&type=track,album,artist&market=DE&limit=20\`
- Track: \`/tracks/{id}\`
- New Releases: \`/browse/new-releases?country=DE&limit=20\`
- Empfehlungen: \`/recommendations?seed_genres=electronic,pop&market=DE&limit=20\`

**Response (search tracks)**:
\`\`\`json
{
  "tracks": { "items": [{
    "id": "abc123",
    "name": "Nachtfahrt",
    "artists": [{ "name": "Kraftwerk" }],
    "album": { "name": "Autobahn", "images": [{ "url": "https://i.scdn.co/image/...", "width": 640 }] },
    "duration_ms": 234000,
    "preview_url": "https://p.scdn.co/mp3-preview/..."
  }]}
}
\`\`\`

**30-Sekunden Preview** abspielen mit HTML5 Audio:
\`\`\`jsx
const audio = new Audio(track.preview_url);
audio.volume = 0.7;
audio.play();
\`\`\`

**Fallback** (kein Spotify-Key):
\`\`\`js
const FALLBACK_TRACKS = [
  { id: '1', name: 'Nachtfahrt', artist: 'Kraftwerk', album: 'Autobahn', duration: 234, artwork: null },
  { id: '2', name: 'Autobahn', artist: 'Kraftwerk', album: 'Autobahn', duration: 1326, artwork: null },
  { id: '3', name: 'Blue Monday', artist: 'New Order', album: 'Power, Corruption & Lies', duration: 289, artwork: null },
  { id: '4', name: 'Trans Europa Express', artist: 'Kraftwerk', album: 'TEE', duration: 402, artwork: null },
  { id: '5', name: 'Enjoy the Silence', artist: 'Depeche Mode', album: 'Violator', duration: 372, artwork: null },
  { id: '6', name: 'Personal Jesus', artist: 'Depeche Mode', album: 'Violator', duration: 296, artwork: null },
  { id: '7', name: 'Das Model', artist: 'Kraftwerk', album: 'Die Mensch-Maschine', duration: 216, artwork: null },
  { id: '8', name: 'Sunglasses at Night', artist: 'Corey Hart', album: 'First Offense', duration: 268, artwork: null },
];
\`\`\`

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/useSpotify.js
- Returns { tracks, search(query), newReleases, currentTrack, play(track), pause(), isPlaying, progress, duration }
- Manages a single HTML5 Audio instance for 30s previews
- Tracks progress via audio.ontimeupdate
- Falls back to FALLBACK_TRACKS if no API key
- play(track) creates new Audio(track.preview_url), stores ref, calls .play()
- pause() calls audio.pause()
- Cleanup: audio.pause() + remove event listeners on unmount
\`\`\`

**Album art**: Verwende \`track.album.images[0].url\` (640px) oder \`[1].url\` (300px). Fallback: dark square (#1B2A45) mit \\u266A Symbol (36px, #5C6B82).
**Display**: Album-Art groß links, Track-Info rechts (Titel H3, Artist Body Secondary #A8B5C8), Progress-Bar (BMW Blue fill auf #1B2A45 Track), Controls (\\u25C2\\u25C2 \\u25B6/\\u2016 \\u25B8\\u25B8), volume bars.`,
  },

  // ── Radio (Radio Browser API) ──────────────────────────────────────────
  {
    types: ['mediaPlayer', 'radioPlayer'],
    serviceId: 'radio-browser',
    label: 'Radio (Radio Browser API — Streams + Stationen)',
    npmPackages: {},
    envVars: {},
    headTags: [],
    promptInstructions: `### Radio (Radio Browser API)

**Keine Authentifizierung erforderlich.**

**Endpoints**:
- Suche: \`GET https://de1.api.radio-browser.info/json/stations/search?name={query}&limit=20&hidebroken=true\`
- Deutsche Top-Stationen: \`GET https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/DE?limit=30&order=clickcount&reverse=true\`
- Top weltweit: \`GET https://de1.api.radio-browser.info/json/stations/topclick/30\`
- Nach Genre/Tag: \`GET https://de1.api.radio-browser.info/json/stations/bytag/{tag}?limit=20&order=clickcount&reverse=true\`

**Headers**: \`{ 'User-Agent': 'BMWiDrivePrototype/1.0' }\`

**Response format**:
\`\`\`json
[{
  "stationuuid": "abc-123",
  "name": "Bayern 3",
  "url_resolved": "https://stream.antenne.de/bayern3/...",
  "favicon": "https://www.br.de/radio/bayern3/favicon.png",
  "country": "Germany",
  "tags": "pop,rock,hits",
  "codec": "MP3",
  "bitrate": 128,
  "clickcount": 54321
}]
\`\`\`

**Streaming**: \`url_resolved\` direkt als HTML5 Audio-Quelle:
\`\`\`jsx
const audio = new Audio(station.url_resolved);
audio.play(); // Endlos-Stream, kein duration/progress
\`\`\`

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/useRadio.js
- Returns { stations, search(query), topStations(), currentStation, play(station), stop(), isPlaying, error }
- Lädt initial Top-30 deutsche Stationen (bycountrycodeexact/DE)
- Streaming via HTML5 Audio (kein progress tracking — live stream)
- Beim Stationswechsel: altes Audio stoppen, neues starten
- Station-Favicon als Icon (mit Fallback auf FM-CSS-Icon)
- Cleanup auf unmount
\`\`\`

**Display**: Stations-Liste als horizontale scrollbare Cards oder vertikale Liste. Aktive Station: BMW Blue Glow-Rand (\`0 0 16px rgba(28,105,212,0.5)\`). Favicon als rundes Icon (32px, border-radius 50%, object-fit cover, bg #1B2A45 fallback). Station-Name (Body, #FFFFFF) + Tags (Label, #A8B5C8 uppercase). Bitrate als kleines Badge.`,
  },

  // ── Podcasts (Podcast Index API) ───────────────────────────────────────
  {
    types: ['mediaPlayer', 'podcastPlayer'],
    serviceId: 'podcast-index',
    label: 'Podcasts (Podcast Index API)',
    npmPackages: {},
    envVars: {
      VITE_PODCAST_INDEX_KEY: 'Podcast Index API Key (podcastindex.org)',
      VITE_PODCAST_INDEX_SECRET: 'Podcast Index API Secret',
    },
    headTags: [],
    promptInstructions: `### Podcasts (Podcast Index API)

**Auth** (API Key + Secret, SHA-1 Hash):
\`\`\`js
// FILE: services/podcastIndex.js
const API_KEY = import.meta.env.VITE_PODCAST_INDEX_KEY;
const API_SECRET = import.meta.env.VITE_PODCAST_INDEX_SECRET;

export async function podcastFetch(endpoint) {
  if (!API_KEY || !API_SECRET) return null;

  const ts = Math.floor(Date.now() / 1000);
  const authStr = API_KEY + API_SECRET + ts;
  const hashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(authStr));
  const hash = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

  const res = await fetch(\`https://api.podcastindex.org/api/1.0\${endpoint}\`, {
    headers: {
      'User-Agent': 'BMWiDrivePrototype/1.0',
      'X-Auth-Key': API_KEY,
      'X-Auth-Date': String(ts),
      'Authorization': hash,
    },
  });
  return res.json();
}
\`\`\`

**Endpoints**:
- Suche: \`/search/byterm?q={query}&max=20\`
- Trending: \`/podcasts/trending?max=20&lang=de,en&cat=Technology,Automotive,News\`
- Episoden: \`/episodes/byfeedid?id={feedId}&max=10\`

**Response (search)**:
\`\`\`json
{ "feeds": [{
  "id": 12345, "title": "Bits und so", "author": "Timo Proper",
  "image": "https://...", "description": "...", "categories": { "1": "Technology" }
}]}
\`\`\`

**Response (episodes)**:
\`\`\`json
{ "items": [{
  "id": 67890, "title": "Folge 842: Apple Intelligence",
  "enclosureUrl": "https://..../episode.mp3",
  "duration": 5400, "datePublished": 1700000000, "image": "https://..."
}]}
\`\`\`

**Episode abspielen**:
\`\`\`jsx
const audio = new Audio(episode.enclosureUrl);
audio.play(); // Volle Episode, mit duration + progress tracking
\`\`\`

**Fallback** (kein Key):
\`\`\`js
const FALLBACK_PODCASTS = [
  { id: '1', title: 'Bits und so', author: 'Timo Proper', episodes: 842, image: null },
  { id: '2', title: 'Lanz & Precht', author: 'ZDF', episodes: 210, image: null },
  { id: '3', title: 'Lex Fridman Podcast', author: 'Lex Fridman', episodes: 420, image: null },
  { id: '4', title: 'Ubermorgen', author: 'BR', episodes: 155, image: null },
  { id: '5', title: 'The Vergecast', author: 'The Verge', episodes: 600, image: null },
];
const FALLBACK_EPISODES = [
  { id: '1', title: 'Folge 842: Apple Intelligence', duration: 5400, date: '2024-11-15' },
  { id: '2', title: 'Folge 841: Vision Pro im Auto', duration: 4800, date: '2024-11-08' },
  { id: '3', title: 'Folge 840: BMW iX Flow', duration: 5100, date: '2024-11-01' },
];
\`\`\`

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/usePodcasts.js
- Returns { podcasts, search(query), trending(), episodes(feedId), currentEpisode, play(episode), pause(), isPlaying, progress, duration }
- Audio playback via HTML5 Audio mit ontimeupdate tracking
- Falls back to FALLBACK_PODCASTS/EPISODES if no API key
- Format duration: "1:30:00" (h:mm:ss) oder "45:00" (mm:ss)
\`\`\`

**Display**: Podcast-Cover als große Karte (200x200px, border-radius 12px). Titel H4 #FFFFFF, Author Label #A8B5C8. Episoden als scrollbare Liste mit Datum + Duration.`,
  },

  // ── EV-Charging (Open Charge Map + TomTom) ────────────────────────────
  {
    types: ['chargingStation'],
    serviceId: 'ev-charging',
    label: 'EV-Ladestationen (Open Charge Map + TomTom Live)',
    npmPackages: {},
    envVars: {
      VITE_TOMTOM_KEY: 'TomTom API Key (developer.tomtom.com) — optional, für Live-Verfügbarkeit',
    },
    headTags: [],
    promptInstructions: `### EV-Ladestationen (Open Charge Map + TomTom Live-Verfugbarkeit)

**Open Charge Map** (keine Authentifizierung fur Basisdaten):

**Endpoint**:
\`\`\`
GET https://api.openchargemap.io/v3/poi/?latitude={lat}&longitude={lon}&distance=15&distanceunit=km&maxresults=20&compact=true&verbose=false&output=json
\`\`\`

**Response format**:
\`\`\`json
[{
  "ID": 12345,
  "AddressInfo": {
    "Title": "IONITY Munchen-Ost",
    "AddressLine1": "Leopoldstrase 42",
    "Town": "Munchen",
    "Latitude": 48.155,
    "Longitude": 11.583,
    "Distance": 1.2
  },
  "Connections": [{
    "ConnectionTypeID": 33,
    "ConnectionType": { "Title": "CCS (Type 2)" },
    "PowerKW": 350,
    "Quantity": 4
  }],
  "OperatorInfo": { "Title": "IONITY" },
  "NumberOfPoints": 4,
  "StatusType": { "IsOperational": true }
}]
\`\`\`

**TomTom Live-Verfugbarkeit** (optional, braucht Key):
\`\`\`
GET https://api.tomtom.com/search/2/chargingAvailability.json?chargingAvailability={connectorId}&key={VITE_TOMTOM_KEY}
\`\`\`
Fallback ohne TomTom-Key: Simuliere Verfugbarkeit (random 1-N von total frei, wechselt alle 30s).

**Connector-Typ Icons** (CSS-drawn shapes, KEINE Emoji):
- CCS (Type 2): \\u25C9 circle — #1C69D4 BMW Blue
- CHAdeMO: \\u25CE target — #3CD278 Green
- Type 2 AC: \\u25CB open circle — #FFFFFF
- Schuko: \\u25A1 square — #5C6B82

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/useChargingStations.js
- Takes (lat, lon, radiusKm = 15)
- Returns { stations, loading, error, selectedStation, selectStation(id) }
- Enriches mit TomTom availability wenn VITE_TOMTOM_KEY vorhanden
- Berechnet Entfernung mit Haversine (unter 1km -> Meter, sonst "X,Y km")
- Sort by distance ascending
- Refresh alle 60 Sekunden fur Live-Verfugbarkeit
\`\`\`

**Karte**: Stations-Pins als farbige Kreise:
- Verfugbar (>50%): #3CD278 Green + glow
- Teilweise (<50%): #F0C040 Warning + glow
- Belegt (0 frei): #E63946 Danger
- Unbekannt: #5C6B82

**Detail-Panel** (Seitenpanel oder Bottom-Sheet):
Name (H4), Operator (Label #A8B5C8), Adresse, Entfernung. Pro Connector: Typ-Icon + Leistung ("350 kW") + Verfugbarkeit ("3/4 frei"). Gesamt-Status als farbiger Badge.`,
  },

  // ── Weather (Open-Meteo) ───────────────────────────────────────────────
  {
    types: ['weatherWidget'],
    serviceId: 'open-meteo',
    label: 'Wetter (Open-Meteo — kein Key)',
    npmPackages: {},
    envVars: {},
    headTags: [],
    promptInstructions: `### Wetter (Open-Meteo)

**Keine Authentifizierung erforderlich.**

**Endpoint (aktuelles Wetter)**:
\`\`\`
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&timezone=Europe/Berlin
\`\`\`

**Endpoint (Stunden-Vorhersage)**:
\`\`\`
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weathercode,precipitation_probability&timezone=Europe/Berlin&forecast_days=1
\`\`\`

**Response format**:
\`\`\`json
{
  "current": {
    "temperature_2m": 18.2,
    "weathercode": 3,
    "windspeed_10m": 12.5,
    "relative_humidity_2m": 65
  }
}
\`\`\`

**WMO Weather Codes -> deutsche Beschreibung + Icon** (geometrische Unicode, KEINE Emoji):
- 0 Klar: \\u25CB (open circle)
- 1-3 Bewolkt: \\u25D0 (half circle)
- 45-48 Nebel: \\u2261 (triple bar)
- 51-55 Niesel: \\u2236 (dots)
- 61-65 Regen: \\u22EE (vertical dots)
- 71-77 Schnee: \\u2733 (asterisk)
- 80-82 Schauer: \\u22EE\\u22EE (double dots)
- 95-99 Gewitter: CSS bolt shape (rotated rectangle)

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/useWeather.js
- Takes (lat, lon) — defaults to Munich (48.1351, 11.5820)
- Returns { current: { temp, code, description, icon, wind, humidity }, forecast: Array<{hour, temp, code, icon}>, loading }
- Refresh alle 15 Minuten (900000ms interval)
- Wandelt WMO-Code in Icon-String + deutsche Beschreibung um
- Cleanup interval auf unmount
\`\`\`

**Integration**: Wenn StatusBar vorhanden, kann sie useWeather() nutzen um die Ausentemperatur live anzuzeigen statt statisch "18\\u00B0C". Bei Dashboard/Widget: Kompakte Karte mit Temp (Display 48px), Wetter-Icon (32px), Wind, Luftfeuchtigkeit. Optional: 6h-Forecast-Balken.`,
  },

  // ── Climate Control (Simulated) ────────────────────────────────────────
  {
    types: ['climateControl'],
    serviceId: 'climate-sim',
    label: 'Climate Control (Simulated)',
    npmPackages: {},
    envVars: {},
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
- Temperature: Large number (display typography, 3rem) with \\u25B3 \\u25BD buttons
- Fan speed: 5 horizontal bars, filled bars = active level
- AC button: \\u2733 icon (or CSS snowflake shape), BMW Blue when active, muted when off
- Seat heating: 3-level icon indicator
- AUTO button: text button, BMW Blue when active

**Layout**: Horizontal — driver zone | center controls (fan, AC, AUTO) | passenger zone.
**Touch targets**: Temperature buttons min 64px.`,
  },

  // ── Vehicle Info (Simulated) ───────────────────────────────────────────
  {
    types: ['vehicleInfo'],
    serviceId: 'vehicle-sim',
    label: 'Vehicle Data (Simulated)',
    npmPackages: {},
    envVars: {},
    headTags: [],
    promptInstructions: `### Vehicle Info (Simulated Data)

**No external API** — simulated values that drift realistically.

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/useVehicleData.js
- Returns { range, battery, speed, odometer, avgConsumption, outsideTemp, isCharging }
- range: starts at 487 km, decreases ~0.1 km per 3s
- battery: starts at 78%, decreases proportionally
- speed: oscillates 0-65 km/h (city driving), changes every 2-5s
- odometer: 23847 km, increases with speed
- avgConsumption: 18.2 kWh/100km, slight random drift
- outsideTemp: 18°C, stable ±0.5° drift every 30s
- isCharging: false (can be toggled for demo)
- Uses setInterval, cleans up on unmount
\`\`\`

**Display**: Compact row — \\u25A0 78% | 487 km | 18.2 kWh/100km (use CSS-drawn battery icon, NO emoji)`,
  },

  // ── Status Bar ─────────────────────────────────────────────────────────
  {
    types: ['statusBar'],
    serviceId: 'status-bar',
    label: 'Status Bar (Live Clock + Weather)',
    npmPackages: {},
    envVars: {},
    headTags: [],
    promptInstructions: `### Status Bar (Browser APIs + Live Weather)

**Real-time clock** — use useState + useEffect:
\`\`\`javascript
const [time, setTime] = useState(new Date());
useEffect(() => {
  const id = setInterval(() => setTime(new Date()), 1000);
  return () => clearInterval(id);
}, []);
const timeStr = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
\`\`\`

**Outside temperature**: Wenn useWeather Hook verfugbar (weather API detected), nutze echte Daten von Open-Meteo. Sonst: statisch "18\\u00B0C".

**Simulated values**:
- Signal: 4 of 5 bars (static, draw as 5 small rects with 4 filled)
- Network: "BMW Connected" text

**Layout**: Row — left: BMW logo/text | center: time | right: signal + temp + connectivity`,
  },

  // ── POI Search (Overpass) ──────────────────────────────────────────────
  {
    types: ['poiList', 'poiItem'],
    serviceId: 'overpass-poi',
    label: 'POI Search (Overpass / OpenStreetMap)',
    npmPackages: {},
    envVars: {},
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

**POI icons by amenity** (geometric Unicode or CSS-drawn, NO EMOJI): fuel \\u25A0 | parking P | restaurant \\u25C6 | cafe \\u25CF | fast_food \\u25B8 | bank \\u25A3 | pharmacy \\u271A
Draw each icon as a styled CSS shape (colored div with border-radius, border, etc.) or use single-character geometric Unicode. Never use emoji.

**Implementation** — custom hook:
\`\`\`
// FILE: hooks/usePOISearch.js
- Takes (lat, lon, category?)
- Returns { pois: Array<{name, type, lat, lon, distance}>, loading, error }
- Calculate distance with Haversine formula
- Sort by distance ascending
- Format: under 1km -> meters, else km with 1 decimal
\`\`\``,
  },
];

// ---------------------------------------------------------------------------
// Shared context prompts
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

const MEDIA_CONTEXT_PROMPT = `### Shared Media Context

Create a React Context for media playback across Spotify, Radio, and Podcasts:

\`\`\`
// FILE: context/MediaContext.jsx
\`\`\`

**Provides**:
- \`source\`: 'spotify' | 'radio' | 'podcast' (aktuell aktive Quelle)
- \`currentTrack\`: { title, artist, album, artwork, duration, previewUrl } | null
- \`currentStation\`: { name, url, favicon } | null
- \`currentEpisode\`: { title, podcast, artwork, duration, audioUrl } | null
- \`isPlaying\`: boolean
- \`progress\`: number (Sekunden)
- \`duration\`: number (Sekunden, 0 bei Radio = live stream)
- \`play()\`, \`pause()\`, \`seek(seconds)\`, \`next()\`, \`prev()\`
- \`setSource(source)\`

**Behavior**:
- Verwaltet EIN HTML5 Audio-Element für alle Quellen
- Wenn Source wechselt → aktuelle Wiedergabe stoppen, neue Quelle starten
- Spotify: 30-Sekunden Previews (duration = 30s)
- Radio: Endlos-Stream (duration = 0, kein progress tracking)
- Podcast: Volle Episode (duration = episode.duration, progress tracking)
- Progress-Tracking via \`audio.ontimeupdate\` Event
- Wrap die Media-Screens in \`<MediaProvider>\`

**Usage**:
\`\`\`jsx
import { useMedia } from '../context/MediaContext.jsx';
const { currentTrack, isPlaying, play, pause, progress, source, setSource } = useMedia();
\`\`\``;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function collectTypes(node, types = new Set()) {
  types.add(node.type);
  for (const child of node.children ?? []) collectTypes(child, types);
  return types;
}

/**
 * Resolve which APIs/libraries to include based on detected component types.
 * @param {object} componentTree — the component tree from Phase 2
 * @returns {object} { packages, headTags, promptSections, detectedServices, hasAPIs, envVars }
 */
export function resolveAPIs(componentTree) {
  const types = collectTypes(componentTree);

  const matched = new Map();
  for (const entry of REGISTRY) {
    if (entry.types.some(t => types.has(t)) && !matched.has(entry.serviceId)) {
      matched.set(entry.serviceId, entry);
    }
  }

  const packages = {};
  const headTags = [];
  const promptSections = [];
  const detectedServices = [];
  const envVars = {};

  for (const entry of matched.values()) {
    Object.assign(packages, entry.npmPackages);
    headTags.push(...entry.headTags);
    promptSections.push(entry.promptInstructions);
    detectedServices.push(entry.label);
    if (entry.envVars) Object.assign(envVars, entry.envVars);
  }

  // Shared Navigation Context: map + (routing | search)
  const hasMap     = matched.has('maplibre-map');
  const hasRouting = matched.has('osrm-routing');
  const hasSearch  = matched.has('nominatim-geocoding');

  if (hasMap && (hasRouting || hasSearch)) {
    promptSections.unshift(NAVIGATION_CONTEXT_PROMPT);
    detectedServices.unshift('Shared Navigation Context');
  }

  // Shared Media Context: 2+ of (spotify | radio | podcast)
  const mediaCount = [
    matched.has('spotify-music'),
    matched.has('radio-browser'),
    matched.has('podcast-index'),
  ].filter(Boolean).length;

  if (mediaCount >= 2) {
    promptSections.unshift(MEDIA_CONTEXT_PROMPT);
    detectedServices.unshift('Shared Media Context');
  }

  return {
    packages,
    headTags,
    promptSections,
    detectedServices,
    hasAPIs: matched.size > 0,
    envVars,
  };
}
