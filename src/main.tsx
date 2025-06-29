import React from 'react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (e) {
    rootElement.innerHTML = `<div style="color:red;text-align:center;margin-top:2em;">
      Failed to load React app.<br/>${e instanceof Error ? e.message : e}
    </div>`;
  }
} else {
  document.body.innerHTML = `<div style="color:red;text-align:center;margin-top:2em;">
    Root element not found. React app cannot be loaded.
  </div>`;
}
