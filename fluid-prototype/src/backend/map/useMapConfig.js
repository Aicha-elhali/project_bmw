import { useMemo } from 'react';
import { getMapStyle, getDefaultViewport } from '../services/mapService.js';

export function useMapConfig() {
  const maptilerKey = typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_MAPTILER_KEY
    : undefined;

  const mapStyle = useMemo(() => getMapStyle(maptilerKey), [maptilerKey]);
  const initialViewport = useMemo(() => getDefaultViewport(), []);

  return { mapStyle, initialViewport };
}
