## Weather

### hooks/useWeather.js
Hook: `useWeather(lat?, lon?)`
Returns: `{ current: {temp, code, description, wind, humidity}, forecast: Array<{hour, temp, code}>, loading, error }`
Auto-refreshes every 15 minutes.

### services/weatherService.js
- `getCurrentWeather(lat, lon, signal): Promise<{current, forecast}>`
