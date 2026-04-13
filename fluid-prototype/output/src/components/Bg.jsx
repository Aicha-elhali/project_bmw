// Figma: INSTANCE "BG"

import React from 'react';
import Border from './Border.jsx';
import Fill from './Fill.jsx';

const Bg = ({ children, style: overrideStyle }) => {
  const style = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '300',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: '1000px',
    width: '100%',
    height: '48px',
    position: 'relative',
    color: '#FFFFFF',
    ...overrideStyle,
  };

  return (
    <div style={style}>
      <Fill />
      <Border />
      {children}
    </div>
  );
};

export default Bg;