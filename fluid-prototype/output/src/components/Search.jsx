// Figma: TEXT "Search"

import React from 'react';

const Search = ({ value, onChange, placeholder = 'Search', style: overrideStyle }) => {
  const style = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '400',
    flex: 1,
    minWidth: 0,
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    fontSize: '1rem',
    lineHeight: '1.625rem',
    border: 'none',
    outline: 'none',
    caretColor: '#1C69D4',
    padding: 0,
    margin: 0,
    ...overrideStyle,
  };

  const placeholderStyle = `
    input[data-bmw-search]::placeholder {
      color: rgba(255,255,255,0.5);
      font-weight: 300;
    }
  `;

  return (
    <>
      <style>{placeholderStyle}</style>
      <input
        data-bmw-search
        type="text"
        style={style}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label="Search"
      />
    </>
  );
};

export default Search;