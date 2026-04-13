// Figma: INSTANCE "Magnifying Glass"

import React from 'react';

const MagnifyingGlass = ({ style: overrideStyle }) => {
  const wrapperStyle = {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '20px',
    height: '20px',
    color: 'rgba(255,255,255,0.75)',
    ...overrideStyle,
  };

  const svgStyle = {
    width: '16px',
    height: '16px',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  return (
    <div style={wrapperStyle}>
      <svg style={svgStyle} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
  );
};

export default MagnifyingGlass;