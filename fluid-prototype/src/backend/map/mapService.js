const RASTER_FALLBACK = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }],
};

export function getMapStyle(maptilerKey) {
  if (maptilerKey) {
    return `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${maptilerKey}`;
  }
  return RASTER_FALLBACK;
}

export function getDefaultViewport() {
  return { longitude: 11.582, latitude: 48.1351, zoom: 13, pitch: 45 };
}
