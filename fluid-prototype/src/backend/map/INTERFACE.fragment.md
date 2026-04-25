## Map

### hooks/useMapConfig.js
Hook: `useMapConfig()`
Returns: `{ mapStyle, initialViewport: {longitude, latitude, zoom, pitch} }`

### services/mapService.js
- `getMapStyle(maptilerKey?): string|object` — returns MapTiler vector URL or raster fallback
- `getDefaultViewport(): {longitude, latitude, zoom, pitch}` — Munich default
