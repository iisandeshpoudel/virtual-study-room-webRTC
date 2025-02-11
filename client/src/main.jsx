import './lib/polyfills';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Toaster } from './components/ui/toaster';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
      <Toaster />
    </React.StrictMode>
  );
}
