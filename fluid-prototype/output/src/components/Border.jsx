// Figma: FRAME "Border"

import React from 'react';

const Border = ({ children, style: overrideStyle }) => {
  const style = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '300',
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: '1000px',
    border: '1px solid rgba(255,255,255,0.3)',
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

export default Border;