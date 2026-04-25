const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const WMO_CODES = {
  0: { description: 'Clear sky', icon: 'bolt' },
  1: { description: 'Mainly clear', icon: 'bolt' },
  2: { description: 'Partly cloudy', icon: 'bolt' },
  3: { description: 'Overcast', icon: 'bolt' },
  45: { description: 'Fog', icon: 'bolt' },
  48: { description: 'Rime fog', icon: 'bolt' },
  51: { description: 'Light drizzle', icon: 'bolt' },
  53: { description: 'Moderate drizzle', icon: 'bolt' },
  61: { description: 'Slight rain', icon: 'bolt' },
  63: { description: 'Moderate rain', icon: 'bolt' },
  65: { description: 'Heavy rain', icon: 'bolt' },
  71: { description: 'Slight snow', icon: 'bolt' },
  73: { description: 'Moderate snow', icon: 'bolt' },
  75: { description: 'Heavy snow', icon: 'bolt' },
  80: { description: 'Slight rain showers', icon: 'bolt' },
  81: { description: 'Moderate rain showers', icon: 'bolt' },
  95: { description: 'Thunderstorm', icon: 'triangleAlert' },
};

const FALLBACK = {
  current: { temp: 19, code: 2, description: 'Partly cloudy', wind: 12, humidity: 55 },
  forecast: [
    { hour: '14:00', temp: 20, code: 2 },
    { hour: '15:00', temp: 21, code: 1 },
    { hour: '16:00', temp: 20, code: 3 },
    { hour: '17:00', temp: 18, code: 61 },
    { hour: '18:00', temp: 17, code: 2 },
  ],
};

function decodeWMO(code) {
  return WMO_CODES[code] || { description: 'Unknown', icon: 'bolt' };
}

export async function getCurrentWeather(lat = 48.1351, lon = 11.582, signal) {
  try {
    const params = new URLSearchParams({
      latitude: lat, longitude: lon,
      current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m',
      hourly: 'temperature_2m,weather_code',
      forecast_hours: '6',
      timezone: 'auto',
    });
    const res = await fetch(`${OPEN_METEO_URL}?${params}`, { signal });
    if (!res.ok) return FALLBACK;
    const data = await res.json();

    const current = {
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      description: decodeWMO(data.current.weather_code).description,
      wind: Math.round(data.current.wind_speed_10m),
      humidity: data.current.relative_humidity_2m,
    };

    const forecast = (data.hourly?.time || []).slice(0, 6).map((t, i) => ({
      hour: new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      temp: Math.round(data.hourly.temperature_2m[i]),
      code: data.hourly.weather_code[i],
    }));

    return { current, forecast };
  } catch {
    return FALLBACK;
  }
}
