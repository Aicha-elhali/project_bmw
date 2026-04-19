// Root — assembles the full screen layout
import React from 'react';
import Component164 from './components/164.jsx';

const App = () => {
  const appStyle = {
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    backgroundColor: '#0D0D0D',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", sans-serif',
    boxSizing: 'border-box',
  };

  const screenStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div style={appStyle}>
      {/* Global style reset */}
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body, #root {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: #0D0D0D;
        }
        button {
          outline: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        button:focus {
          outline: none;
        }
        /* Leaflet z-index fix for automotive context */
        .leaflet-pane {
          z-index: 4;
        }
        .leaflet-top,
        .leaflet-bottom {
          z-index: 6;
        }
        .leaflet-map-pane {
          z-index: 2;
        }
      `}</style>
      <div style={screenStyle}>
        <Component164 />
      </div>
    </div>
  );
};

export default App;