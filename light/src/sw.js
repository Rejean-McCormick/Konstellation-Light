// Offline mode is opt-in from the UI. Only same-origin static public assets are cached.
const CACHE = 'konstellation-light-public-v1';
const SHELL = ['./','./index.html','./app.js','./style.css','./data/catalog.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  e.respondWith(fetch(e.request).then(response => { if(response.ok && response.type === 'basic') { const copy=response.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return response; }).catch(async () => (await caches.match(e.request)) || Response.error()));
});
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'KEEP' || !Array.isArray(e.data.urls)) return;
  e.waitUntil(caches.open(CACHE).then(async cache => {for (const rel of e.data.urls.slice(0,30)) { if(typeof rel !== 'string' || !/^\.\/data\/(catalog\.json|pack-[a-f0-9]{64}\.json)$/.test(rel)) continue; await cache.add(rel); }}));
});
