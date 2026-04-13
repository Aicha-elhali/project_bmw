// Figma: INSTANCE "search-field"

import React, { useState } from 'react';
import Bg from './Bg.jsx';
import MagnifyingGlass from './MagnifyingGlass.jsx';
import Search from './Search.jsx';
import Clear from './Clear.jsx';

const SearchField = ({ style: overrideStyle }) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const wrapperStyle = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '400',
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: focused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
    borderRadius: '1000px',
    border: focused ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.2)',
    padding: '0 1rem 0 0.75rem',
    height: '48px',
    width: '239px',
    transition: 'background-color 0.25s ease-in-out, border-color 0.25s ease-in-out',
    color: '#FFFFFF',
    boxShadow: focused ? '0 0 0 0.0625rem #FFFFFF, 0 0 0 0.3125rem #1C69D4' : 'none',
    ...overrideStyle,
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div style={wrapperStyle}>
      <MagnifyingGlass />
      <Search
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <Clear visible={query.length > 0} onClick={handleClear} />
    </div>
  );
};

export default SearchField;