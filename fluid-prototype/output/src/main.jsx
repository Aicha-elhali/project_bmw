// Figma: Vite entry point

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const globalStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    font-family: "bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif;
    font-weight: 300;
    background-color: #F6F6F6;
    color: #262626;
    min-height: 100vh;
    overflow-x: hidden;
  }

  button {
    font-family: "bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif;
  }

  input {
    font-family: "bmwTypeNextWeb", "Arial", "Helvetica", "Roboto", sans-serif;
  }

  :focus-visible {
    outline: none;
    box-shadow: 0 0 0 0.0625rem #FFFFFF, 0 0 0 0.3125rem #1C69D4;
  }

  @font-face {
    font-family: 'bmwTypeNextWeb';
    src: local('Arial');
    font-weight: 300;
    font-style: normal;
  }
`;

const styleTag = document.createElement('style');
styleTag.textContent = globalStyles;
document.head.appendChild(styleTag);

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);