## EV Charging

### hooks/useChargingStations.js
Hook: `useChargingStations(lat?, lon?, radius?)`
Returns: `{ stations: Array<{id, name, lat, lon, distance, power, connector, available}>, loading, error, selectedStation, selectStation(station) }`

### services/chargingService.js
- `getNearbyStations(lat, lon, radius, signal): Promise<Array<station>>`
