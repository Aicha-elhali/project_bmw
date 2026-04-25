const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_URL = 'https://api.spotify.com/v1';

const FALLBACK_TRACKS = [
  { id: '1', title: 'Highway State of Mind', artist: 'Auto Pilot', album: 'Long Drive Vol. 2', duration: 30, previewUrl: null, artwork: null },
  { id: '2', title: 'Midnight Autobahn', artist: 'Neon Driver', album: 'Night Shift', duration: 30, previewUrl: null, artwork: null },
  { id: '3', title: 'Electric Dreams', artist: 'Volt', album: 'Charge Up', duration: 30, previewUrl: null, artwork: null },
  { id: '4', title: 'Cruising Munich', artist: 'Bavaria Sound', album: 'Stadtfahrt', duration: 30, previewUrl: null, artwork: null },
  { id: '5', title: 'Open Road', artist: 'Horizont', album: 'Fernweh', duration: 30, previewUrl: null, artwork: null },
];

let tokenCache = { token: null, expires: 0 };

async function getToken() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (tokenCache.token && Date.now() < tokenCache.expires) return tokenCache.token;

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) return null;
    const data = await res.json();
    tokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return data.access_token;
  } catch {
    return null;
  }
}

function mapTrack(t) {
  return {
    id: t.id,
    title: t.name,
    artist: t.artists?.map(a => a.name).join(', ') || 'Unknown',
    album: t.album?.name || '',
    duration: Math.round((t.duration_ms || 30000) / 1000),
    previewUrl: t.preview_url,
    artwork: t.album?.images?.[0]?.url || null,
  };
}

export async function spotifySearch(query, signal) {
  const token = await getToken();
  if (!token) return FALLBACK_TRACKS;
  try {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return FALLBACK_TRACKS;
    const data = await res.json();
    return (data.tracks?.items || []).map(mapTrack);
  } catch {
    return FALLBACK_TRACKS;
  }
}

export async function getNewReleases(signal) {
  const token = await getToken();
  if (!token) return FALLBACK_TRACKS;
  try {
    const res = await fetch(`${API_URL}/browse/new-releases?limit=10`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return FALLBACK_TRACKS;
    const data = await res.json();
    const albums = data.albums?.items || [];
    return albums.map(a => ({
      id: a.id,
      title: a.name,
      artist: a.artists?.map(x => x.name).join(', ') || 'Unknown',
      album: a.name,
      duration: 30,
      previewUrl: null,
      artwork: a.images?.[0]?.url || null,
    }));
  } catch {
    return FALLBACK_TRACKS;
  }
}

export function getFallbackTracks() {
  return [...FALLBACK_TRACKS];
}
