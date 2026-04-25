import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const globalStyles = [
  '@font-face {',
  "  font-family: 'BMW Type Next';",
  '  font-display: swap;',
  '  font-weight: 100 900;',
  "  src: local('BMW Type Next'),",
  "       local('BMWTypeNext'),",
  "       url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2') format('woff2');",
  '}',
  '* {',
  '  box-sizing: border-box;',
  '  margin: 0;',
  '  padding: 0;',
  '  -webkit-tap-highlight-color: transparent;',
  '}',
  'html {',
  '  font-size: 16px;',
  '  -webkit-font-smoothing: antialiased;',
  '  -moz-osx-font-smoothing: grayscale;',
  '  text-rendering: optimizeLegibility;',
  '}',
  'body {',
  '  font-family: "BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
  '  font-weight: 400;',
  '  background-color: #0A1428;',
  '  color: #FFFFFF;',
  '  width: 100vw;',
  '  height: 100vh;',
  '  overflow: hidden;',
  '  cursor: default;',
  '  user-select: none;',
  '}',
  '#root {',
  '  width: 100%;',
  '  height: 100%;',
  '}',
  'button {',
  '  font-family: inherit;',
  '  cursor: pointer;',
  '  border: none;',
  '  background: none;',
  '  color: inherit;',
  '}',
  'input {',
  '  font-family: inherit;',
  '  border: none;',
  '  outline: none;',
  '  background: none;',
  '  color: inherit;',
  '}',
  '::-webkit-scrollbar {',
  '  width: 4px;',
  '}',
  '::-webkit-scrollbar-track {',
  '  background: transparent;',
  '}',
  '::-webkit-scrollbar-thumb {',
  '  background: rgba(255,255,255,0.15);',
  '  border-radius: 2px;',
  '}',
  '::-webkit-scrollbar-thumb:hover {',
  '  background: rgba(255,255,255,0.25);',
  '}',
].join('\n');

const styleTag = document.createElement('style');
styleTag.textContent = globalStyles;
document.head.appendChild(styleTag);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
