const OCM_URL = 'https://api.openchargemap.io/v3/poi';

const FALLBACK_STATIONS = [
  { id: '1', name: 'EnBW Ladestation München-Schwabing', lat: 48.162, lon: 11.586, distance: '1.2 km', power: 50, connector: 'CCS', available: true },
  { id: '2', name: 'IONITY Autobahn A9 Rasthof', lat: 48.201, lon: 11.601, distance: '4.8 km', power: 350, connector: 'CCS', available: true },
  { id: '3', name: 'Stadtwerke München Ladesäule', lat: 48.128, lon: 11.572, distance: '2.1 km', power: 22, connector: 'Type 2', available: false },
  { id: '4', name: 'Tesla Supercharger Parkstadt', lat: 48.109, lon: 11.613, distance: '5.5 km', power: 250, connector: 'CCS', available: true },
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getNearbyStations(lat = 48.1351, lon = 11.582, radius = 10, signal) {
  try {
    const params = new URLSearchParams({
      output: 'json', latitude: lat, longitude: lon,
      distance: radius, distanceunit: 'km', maxresults: '15',
      compact: 'true', verbose: 'false',
    });
    const res = await fetch(`${OCM_URL}?${params}`, { signal });
    if (!res.ok) return FALLBACK_STATIONS;
    const data = await res.json();
    return data.map(s => {
      const dist = haversineKm(lat, lon, s.AddressInfo?.Latitude, s.AddressInfo?.Longitude);
      const conn = s.Connections?.[0];
      return {
        id: String(s.ID),
        name: s.AddressInfo?.Title || 'Charging Station',
        lat: s.AddressInfo?.Latitude,
        lon: s.AddressInfo?.Longitude,
        distance: dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`,
        power: conn?.PowerKW || 0,
        connector: conn?.ConnectionType?.Title || 'Unknown',
        available: s.StatusType?.IsOperational !== false,
      };
    });
  } catch {
    return FALLBACK_STATIONS;
  }
}
