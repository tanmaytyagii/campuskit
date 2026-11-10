/**
 * Registers the service worker that lets CampusKit work offline (production builds only), offers
 * a reload when a new version is ready, and asks the worker to store every template bundle.
 */
import { notify } from '../components/ui/Toast.tsx';

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) return;
    reloading = false;
    window.location.reload();
  });
  const offerUpdate = (worker: ServiceWorker) =>
    notify('A new version of CampusKit is ready.', 'success', {
      label: 'Reload to update',
      run: () => {
        reloading = true;
        worker.postMessage({ type: 'skip-waiting' });
      },
    });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        // A worker that installed while an older one controls the page waits for the student.
        if (registration.waiting && navigator.serviceWorker.controller)
          offerUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller)
              offerUpdate(worker);
          });
        });
      })
      .catch(() => {
        // Without a worker the site works as before, online only.
      });
  });
}

/** True when a service worker controls this page, so stored pages work offline. */
export function offlineReady(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    Boolean(navigator.serviceWorker.controller)
  );
}

/** Asks the worker to store every template bundle; resolves with how many it stored. */
export function cacheAllTemplates(): Promise<number> {
  const worker = 'serviceWorker' in navigator ? navigator.serviceWorker.controller : null;
  if (!worker) return Promise.reject(new Error('offline storage is not available'));
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<{ type?: string; count?: number }>) => {
      if (event.data.type === 'templates-cached') {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        resolve(event.data.count ?? 0);
      } else if (event.data.type === 'templates-failed') {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        reject(new Error('the templates could not be stored'));
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'cache-templates' });
  });
}
