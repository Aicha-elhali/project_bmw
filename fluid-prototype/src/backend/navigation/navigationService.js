const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const FALLBACK_ROUTE = {
  coordinates: [[11.582, 48.135], [11.6, 48.2], [11.65, 48.35], [11.55, 48.75], [11.08, 49.45]],
  distance: '165 km',
  duration: '1 h 42 min',
  steps: [
    { instruction: 'Head north on Ludwigstraße', distance: '450 m', maneuver: 'depart' },
    { instruction: 'Merge onto A9', distance: '152 km', maneuver: 'merge' },
    { instruction: 'Take exit toward Nürnberg-Zentrum', distance: '1.2 km', maneuver: 'off ramp' },
    { instruction: 'Arrive at destination', distance: '0 m', maneuver: 'arrive' },
  ],
};

const FALLBACK_LOCATIONS = [
  { name: 'Marienplatz', lat: 48.1374, lon: 11.5755, address: 'Marienplatz 1, 80331 München' },
  { name: 'BMW Welt', lat: 48.1770, lon: 11.5562, address: 'Am Olympiapark 1, 80809 München' },
  { name: 'Allianz Arena', lat: 48.2188, lon: 11.6247, address: 'Werner-Heisenberg-Allee 25, 80939 München' },
];

export async function searchLocation(query, signal) {
  if (!query || query.length < 2) return [];
  try {
    const params = new URLSearchParams({
      q: query, format: 'json', limit: '5', addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      signal,
      headers: { 'User-Agent': 'BMW-HMI-Prototype/1.0' },
    });
    if (!res.ok) return FALLBACK_LOCATIONS;
    const data = await res.json();
    return data.map(item => ({
      name: item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      address: item.display_name,
    }));
  } catch {
    return FALLBACK_LOCATIONS;
  }
}

function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export async function calculateRoute(from, to, signal) {
  if (!from || !to) return null;
  try {
    const url = `${OSRM_URL}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { signal });
    if (!res.ok) return FALLBACK_ROUTE;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return FALLBACK_ROUTE;
    return {
      coordinates: route.geometry.coordinates,
      distance: formatDistance(route.distance),
      duration: formatDuration(route.duration),
      steps: route.legs[0].steps.map(s => ({
        instruction: s.maneuver.instruction || s.name || 'Continue',
        distance: formatDistance(s.distance),
        maneuver: s.maneuver.type,
      })),
    };
  } catch {
    return FALLBACK_ROUTE;
  }
}
