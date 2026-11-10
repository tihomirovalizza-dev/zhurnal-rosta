// Shows the saved app at once and refreshes the saved copy in the background,
// so a new version appears on the next launch. Requests to Supabase are not touched.
const CACHE = 'zhurnal-v2';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isApp = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (req.mode === 'navigate' && !isApp) return;
  const key = req.mode === 'navigate' ? 'index.html' : req;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    });
    if (saved) {
      event.waitUntil(fresh.catch(() => {}));
      return saved;
    }
    return fresh;
  }));
});
