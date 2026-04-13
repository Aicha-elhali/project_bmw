// Figma: TEXT "button"

import React, { useState } from 'react';

const Button = ({ children, content, style: overrideStyle, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const baseStyle = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: hovered ? '#0653B6' : '#1C69D4',
    color: '#FFFFFF',
    padding: '0.75rem 2rem',
    borderRadius: '3px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    minHeight: '3rem',
    transition: 'color 0.25s ease-in-out, background-color 0.25s ease-in-out, box-shadow 0.25s ease-in-out',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    lineHeight: '1.625rem',
    ...overrideStyle,
  };

  return (
    <button
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {content || children}
    </button>
  );
};

export default Button;