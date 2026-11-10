/*
 * CampusKit's service worker, so the site works offline. vite-plugins/service-worker.ts fills in
 * the placeholders at build time with this build's files and a version.
 *
 * - The app shell (the page, scripts, styles and fonts) is stored when the worker installs.
 * - Pages are fetched from the network first, falling back to the stored page offline.
 * - Hashed assets come from the cache first; other files are served from the cache while a
 *   fresh copy is fetched (stale-while-revalidate).
 * - Only GET requests to this site are handled. Requests to any other site (an AI provider,
 *   for example) and anything that isn't a GET pass straight to the network and are never stored.
 * - A new version waits until the student agrees to reload, so open tabs never lose the files
 *   they were loaded with.
 */
/* global self, caches, __SHELL__, __ASSETS__, __TEMPLATES__ */
const VERSION = '__VERSION__';
const SHELL = __SHELL__;
const ASSETS = __ASSETS__;
const TEMPLATES = __TEMPLATES__;

const BASE = new URL('./', self.location.href).pathname;
const SHELL_CACHE = `campuskit-shell-${VERSION}`;
const RUNTIME_CACHE = 'campuskit-runtime-v1';
// Module scripts are requested with an Origin header, and servers may answer with
// "Vary: Origin"; these files are static, so a stored copy matches regardless.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL.map((path) => BASE + path))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith('campuskit-shell-') && key !== SHELL_CACHE) await caches.delete(key);
      // Files from earlier builds (their names carry a hash) are removed from the runtime cache.
      const current = new Set([...ASSETS, ...TEMPLATES].map((path) => BASE + path));
      const runtime = await caches.open(RUNTIME_CACHE);
      for (const request of await runtime.keys()) {
        const { pathname } = new URL(request.url);
        const versioned =
          pathname.startsWith(`${BASE}assets/`) || pathname.startsWith(`${BASE}template-bundles/`);
        if (versioned && !current.has(pathname)) await runtime.delete(request);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'skip-waiting') self.skipWaiting();
  if (type === 'cache-templates')
    event.waitUntil(
      caches
        .open(RUNTIME_CACHE)
        .then((cache) => cache.addAll(TEMPLATES.map((path) => BASE + path)))
        .then(
          () =>
            event.source &&
            event.source.postMessage({ type: 'templates-cached', count: TEMPLATES.length }),
          () => event.source && event.source.postMessage({ type: 'templates-failed' }),
        ),
    );
  if (type === 'version' && event.source)
    event.source.postMessage({ type: 'version', version: VERSION });
});

async function fromNetwork(request) {
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function page(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(`${BASE}index.html`, MATCH)) || Response.error();
  }
}

async function cacheFirst(request) {
  return (await caches.match(request, MATCH)) || fromNetwork(request);
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, MATCH);
  const fresh = fromNetwork(request).catch(() => undefined);
  return cached || (await fresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (request.mode === 'navigate') event.respondWith(page(request));
  else if (url.pathname.startsWith(`${BASE}assets/`)) event.respondWith(cacheFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});
