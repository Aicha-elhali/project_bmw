// Figma: FRAME "16:4"

import React from 'react';
import Navbar from './Navbar.jsx';

const Frame164 = ({ children, style: overrideStyle }) => {
  const style = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '300',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '16px',
    backgroundColor: '#F6F6F6',
    width: '100%',
    minHeight: '100vh',
    color: '#262626',
    ...overrideStyle,
  };

  return (
    <div style={style}>
      <Navbar />
      {children}
    </div>
  );
};

export default Frame164;