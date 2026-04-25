## Navigation

### context/NavigationContext.jsx
Provider: `<NavigationProvider>`
Hook: `useNavigation()`
Returns: `{ position, destination, route, loading, setDestination(dest), clearRoute() }`

### hooks/useGeocoding.js
Hook: `useGeocoding(query)`
Returns: `{ results: Array<{name, lat, lon, address}>, loading, error }`
Debounced 400ms. Requires query length >= 2.

### hooks/useRouting.js
Hook: `useRouting(origin, destination)`
Returns: `{ route: {coordinates, distance, duration, steps}, loading, error }`

### services/navigationService.js
- `searchLocation(query, signal): Promise<Array<{name, lat, lon, address}>>`
- `calculateRoute(from, to, signal): Promise<{coordinates, distance, duration, steps}>`
