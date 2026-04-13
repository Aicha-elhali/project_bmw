// Figma: TEXT "bmw"

import React from 'react';

const Bmw = ({ children, style: overrideStyle }) => {
  const style = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: '2.875rem',
    color: '#FFFFFF',
    textAlign: 'left',
    margin: 0,
    letterSpacing: '0.05em',
    userSelect: 'none',
    ...overrideStyle,
  };

  return (
    <span style={style}>
      {children || 'BMW'}
    </span>
  );
};

export default Bmw;