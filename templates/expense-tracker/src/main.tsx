import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { applyTheme, ConfigError, loadConfig } from './config';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('index.html is missing <div id="root">');
const root = createRoot(container);

try {
  const config = loadConfig();
  applyTheme(config.theme);
  document.title = config.appName;
  root.render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
} catch (error) {
  // A mistake in app.config.json should explain itself instead of showing a blank page.
  const message = error instanceof ConfigError ? error.message : 'The app could not start.';
  root.render(
    <main className="container main">
      <div className="banner" role="alert">
        <strong>Configuration problem.</strong> {message}
      </div>
    </main>,
  );
  console.error(error);
}
