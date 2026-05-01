import React from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot } from './hmi/HMIChrome.jsx';
import { NavigationProvider, useNavigation } from './context/NavigationContext.jsx';
import Searchcomponent from './components/Searchcomponent.jsx';

const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : {
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

const mapOverrideCSS = `
  .maplibregl-map { background: #0F1A2C; }
  .maplibregl-ctrl-group { display: none; }
  .maplibregl-ctrl-attrib { background: rgba(10,20,40,0.8) !important; color: rgba(255,255,255,0.4) !important; font-size: 0.625rem !important; }
  .maplibregl-ctrl-attrib a { color: rgba(255,255,255,0.4) !important; }
`;

const AppContent = () => {
  const { position, destination, route } = useNavigation();

  return (
    <HMIDisplay>
      {/* Dark theme overrides for map controls */}
      <style>{mapOverrideCSS}</style>

      {/* INTERACTIVE MAP — fills entire display as background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Map
          initialViewState={{
            longitude: position.lon,
            latitude: position.lat,
            zoom: 13,
            pitch: 45,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
        >
          {/* Current position marker */}
          <Marker longitude={position.lon} latitude={position.lat}>
            <div
              style={{
                width: 20,
                height: 20,
                background: '#1C69D4',
                border: '2px solid #fff',
                borderRadius: '50%',
                boxShadow: '0 0 12px rgba(28,105,212,0.6)',
              }}
            />
          </Marker>

          {/* Destination marker */}
          {destination && (
            <Marker longitude={destination.lon} latitude={destination.lat}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: '#5BA3FF',
                  border: '2px solid #fff',
                  borderRadius: '50%',
                  boxShadow: '0 0 12px rgba(91,163,255,0.6)',
                }}
              />
            </Marker>
          )}

          {/* Route line */}
          {route && route.coordinates && (
            <Source
              id="route"
              type="geojson"
              data={{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: route.coordinates,
                },
              }}
            >
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': '#5BA3FF',
                  'line-width': 5,
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* CONTENT — position absolute, inset 0, KEIN top/left Offset */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Searchcomponent />
      </div>

      {/* CHROME — IMMER vorhanden, schwebt ueber allem */}
      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={false} />
      <HMIFooter active="nav" />
    </HMIDisplay>
  );
};

const App = () => {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
};

export default App;