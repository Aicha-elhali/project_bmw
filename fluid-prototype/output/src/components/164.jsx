// Figma: container "16:4"
import React from 'react';
import Navigation from './Navigation.jsx';

const Component164 = ({ style: overrideStyle }) => {
  const style = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", sans-serif',
    fontWeight: '300',
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    backgroundColor: '#0D0D0D',
    overflow: 'hidden',
    ...overrideStyle,
  };

  return (
    <div style={style}>
      <Navigation />
    </div>
  );
};

export default Component164;