// Figma: Root application component

import React from 'react';
import Frame164 from './components/164.jsx';

const heroSectionStyle = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#262626',
  borderRadius: '0.625rem',
  padding: '5rem 2rem',
  width: '100%',
  minHeight: '480px',
  gap: '1.5rem',
  color: '#FFFFFF',
  boxShadow: '0 0.125rem 0.5rem 0 rgba(0,0,0,0.08), 0 0 0.0625rem 0 rgba(0,0,0,0.24)',
};

const headingStyle = {
  boxSizing: 'border-box',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
  fontWeight: '300',
  fontSize: '2.6875rem',
  lineHeight: '3.125rem',
  color: '#FFFFFF',
  margin: 0,
  textAlign: 'center',
  maxWidth: '700px',
};

const subheadingStyle = {
  boxSizing: 'border-box',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
  fontWeight: '300',
  fontSize: '1.1875rem',
  lineHeight: '1.75rem',
  color: 'rgba(255,255,255,0.84)',
  margin: 0,
  textAlign: 'center',
  maxWidth: '560px',
};

const ctaRowStyle = {
  display: 'flex',
  flexDirection: 'row',
  gap: '1rem',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginTop: '1rem',
};

const primaryButtonStyle = {
  backgroundColor: '#1C69D4',
  color: '#FFFFFF',
  fontWeight: '500',
  padding: '0.75rem 2rem',
  borderRadius: '3px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem',
  minHeight: '3rem',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
  transition: 'background-color 0.25s ease-in-out, box-shadow 0.25s ease-in-out',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const ghostButtonStyle = {
  ...primaryButtonStyle,
  backgroundColor: 'transparent',
  border: '1px solid rgba(255,255,255,0.4)',
  color: '#FFFFFF',
};

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '1.5rem',
  width: '100%',
  marginTop: '0.5rem',
};

const cardStyle = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#262626',
  borderRadius: '0.5rem',
  boxShadow: '0 0.125rem 0.5rem 0 rgba(0,0,0,0.08), 0 0 0.0625rem 0 rgba(0,0,0,0.24)',
  padding: '1.5rem',
  gap: '0.75rem',
  color: '#FFFFFF',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
  transition: 'box-shadow 0.25s ease-in-out',
};

const cardTitleStyle = {
  fontWeight: '300',
  fontSize: '1.4375rem',
  lineHeight: '2rem',
  margin: 0,
  color: '#FFFFFF',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
};

const cardBodyStyle = {
  fontWeight: '300',
  fontSize: '1rem',
  lineHeight: '1.625rem',
  margin: 0,
  color: 'rgba(255,255,255,0.75)',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
};

const cardLabelStyle = {
  display: 'inline-block',
  fontWeight: '500',
  fontSize: '0.75rem',
  lineHeight: '1rem',
  color: '#BBD2F3',
  backgroundColor: 'rgba(28,105,212,0.18)',
  borderRadius: '3px',
  padding: '0.25rem 0.5rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
};

const sectionTitleStyle = {
  boxSizing: 'border-box',
  fontFamily: '"bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif',
  fontWeight: '300',
  fontSize: '1.75rem',
  lineHeight: '2.5rem',
  color: '#262626',
  margin: 0,
};

const sectionStyle = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  width: '100%',
  padding: '2rem 0',
};

const cards = [
  {
    id: 1,
    label: 'Neu',
    title: 'BMW iX5 Hydrogen',
    body: 'Erleben Sie die Zukunft der Mobilität mit Brennstoffzellentechnologie und emotionalem Design.',
  },
  {
    id: 2,
    label: 'Elektrisch',
    title: 'BMW i4 M50',
    body: 'Die sportliche Limousine kombiniert Effizienz und Fahrfreude auf höchstem Niveau.',
  },
  {
    id: 3,
    label: 'Bestseller',
    title: 'BMW X5 xDrive50e',
    body: 'Modernste Plug-in-Hybrid-Technologie trifft auf unverwechselbares BMW Design.',
  },
];

const App = () => {
  return (
    <Frame164>
      {/* Hero Section */}
      <section style={heroSectionStyle} aria-label="Hero">
        <h1 style={headingStyle}>
          Freude am Fahren
        </h1>
        <p style={subheadingStyle}>
          Entdecken Sie die neuesten BMW Modelle — vom vollelektrischen i4
          bis zum ikonischen M3. Konfigurieren Sie Ihr Traumfahrzeug online.
        </p>
        <div style={ctaRowStyle}>
          <button style={primaryButtonStyle}>
            Modelle entdecken
          </button>
          <button style={ghostButtonStyle}>
            Jetzt konfigurieren
          </button>
        </div>
      </section>

      {/* Card Section */}
      <section style={sectionStyle} aria-label="Fahrzeugauswahl">
        <h2 style={sectionTitleStyle}>Aktuelle Modelle</h2>
        <div style={cardGridStyle}>
          {cards.map((card) => (
            <article key={card.id} style={cardStyle}>
              <span style={cardLabelStyle}>{card.label}</span>
              <h3 style={cardTitleStyle}>{card.title}</h3>
              <p style={cardBodyStyle}>{card.body}</p>
              <button
                style={{
                  ...primaryButtonStyle,
                  marginTop: '0.5rem',
                  alignSelf: 'flex-start',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  minHeight: '2.5rem',
                }}
              >
                Mehr erfahren
              </button>
            </article>
          ))}
        </div>
      </section>
    </Frame164>
  );
};

export default App;