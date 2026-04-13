// Figma: FRAME "Fill"

import React from 'react';

const Fill = ({ children, style: overrideStyle }) => {
  const style = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '300',
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '1000px',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    color: '#FFFFFF',
    ...overrideStyle,
  };

  return (
    <div style={style}>
      {children}
    </div>
  );
};

export default Fill;