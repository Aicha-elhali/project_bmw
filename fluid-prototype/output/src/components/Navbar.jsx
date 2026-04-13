// Figma: FRAME "navbar"

import React from 'react';
import Bmw from './Bmw.jsx';
import Button from './Button.jsx';
import SearchField from './SearchField.jsx';

const Navbar = ({ style: overrideStyle }) => {
  const navStyle = {
    boxSizing: 'border-box',
    fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
    fontWeight: '300',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262626',
    borderBottom: 'none',
    padding: '0 2rem',
    width: '100%',
    minHeight: '4.25rem',
    color: '#FFFFFF',
    borderRadius: '6px',
    boxShadow: '0 0.125rem 0.5rem 0 rgba(0,0,0,0.08), 0 0 0.0625rem 0 rgba(0,0,0,0.24)',
    ...overrideStyle,
  };

  const logoSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  };

  const navLinksSectionStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    justifyContent: 'center',
  };

  const searchSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  };

  const navButtonStyle = {
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.84)',
    padding: '0.5rem 1rem',
    border: 'none',
    minHeight: '3rem',
    fontSize: '1rem',
    fontWeight: '300',
    borderRadius: '3px',
  };

  return (
    <nav style={navStyle} role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div style={logoSectionStyle}>
        <Bmw />
      </div>

      {/* Nav Links */}
      <div style={navLinksSectionStyle}>
        <Button
          content="Konfigurator"
          style={navButtonStyle}
        />
        <Button
          content="Elektrofahrzeuge"
          style={navButtonStyle}
        />
        <Button
          content="Online kaufen"
          style={navButtonStyle}
        />
      </div>

      {/* Search */}
      <div style={searchSectionStyle}>
        <SearchField />
      </div>
    </nav>
  );
};

export default Navbar;