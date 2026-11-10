import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
// The DOM build of RouterProvider supports flushSync navigations (used by the gallery filters).
import { RouterProvider } from 'react-router/dom';

import { ThemeProvider } from './hooks/useTheme.tsx';
import { applyLocale } from './lib/i18n.ts';
import { registerServiceWorker } from './lib/service-worker.ts';
import { routes } from './routes.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('index.html is missing <div id="root">');

const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
});

applyLocale();
registerServiceWorker();

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
