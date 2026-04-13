// Figma: INSTANCE "Clear"

import React, { useState } from 'react';

const Clear = ({ onClick, visible = false, style: overrideStyle }) => {
  const [hovered, setHovered] = useState(false);

  const wrapperStyle = {
    boxSizing: 'border-box',
    display: visible ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    color: hovered ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
    transition: 'color 0.25s ease-in-out',
    background: 'none',
    border: 'none',
    padding: 0,
    ...overrideStyle,
  };

  const svgStyle = {
    width: '14px',
    height: '14px',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
  };

  return (
    <button
      style={wrapperStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Clear search"
      type="button"
    >
      <svg style={svgStyle} viewBox="0 0 24 24" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
};

export default Clear;