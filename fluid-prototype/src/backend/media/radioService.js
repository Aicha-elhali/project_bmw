const RADIO_API = 'https://de1.api.radio-browser.info/json';

const FALLBACK_STATIONS = [
  { id: '1', name: 'Bayern 3', url: 'https://streams.br.de/bayern3_2.m3u', favicon: null, country: 'DE', tags: 'pop,hits' },
  { id: '2', name: 'Antenne Bayern', url: 'https://stream.antenne.de/antenne', favicon: null, country: 'DE', tags: 'pop' },
  { id: '3', name: 'WDR 2', url: 'https://wdr-wdr2-rheinland.icecastssl.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3', favicon: null, country: 'DE', tags: 'pop,news' },
  { id: '4', name: 'SWR3', url: 'https://liveradio.swr.de/sw282p3/swr3/play.mp3', favicon: null, country: 'DE', tags: 'pop,rock' },
  { id: '5', name: 'Deutschlandfunk', url: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3', favicon: null, country: 'DE', tags: 'news,talk' },
];

function mapStation(s) {
  return {
    id: s.stationuuid || s.id,
    name: s.name,
    url: s.url_resolved || s.url,
    favicon: s.favicon || null,
    country: s.countrycode || s.country || 'DE',
    tags: s.tags || '',
  };
}

export async function getTopStations(country = 'DE', limit = 10, signal) {
  try {
    const res = await fetch(
      `${RADIO_API}/stations/bycountrycodeexact/${country}?order=clickcount&reverse=true&limit=${limit}&hidebroken=true`,
      { signal }
    );
    if (!res.ok) return FALLBACK_STATIONS;
    const data = await res.json();
    return data.map(mapStation);
  } catch {
    return FALLBACK_STATIONS;
  }
}

export async function searchStations(query, limit = 10, signal) {
  if (!query) return [];
  try {
    const res = await fetch(
      `${RADIO_API}/stations/byname/${encodeURIComponent(query)}?limit=${limit}&hidebroken=true`,
      { signal }
    );
    if (!res.ok) return FALLBACK_STATIONS;
    const data = await res.json();
    return data.map(mapStation);
  } catch {
    return FALLBACK_STATIONS;
  }
}

export function getFallbackStations() {
  return [...FALLBACK_STATIONS];
}
