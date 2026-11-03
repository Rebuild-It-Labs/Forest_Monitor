import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts (bundled by Vite — works offline, no Google Fonts request)
import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/share-tech-mono/400.css';

import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
