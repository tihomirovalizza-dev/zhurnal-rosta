// The app page is always loaded fresh when there is a connection, so updates and
// links from emails work at once. The saved copy is used only without a connection.
// Other app files are shown from the saved copy and refreshed in the background.
// Requests to Supabase are not touched.
const CACHE = 'zhurnal-v3';
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

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isApp = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  if (req.mode === 'navigate') {
    if (!isApp) return;
    event.respondWith(caches.open(CACHE).then(async cache => {
      const network = fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) cache.put('index.html', res.clone());
        return res;
      });
      try {
        return await withTimeout(network, 4000);
      } catch (e) {
        const saved = await cache.match('index.html');
        if (saved) { event.waitUntil(network.catch(() => {})); return saved; }
        return network;
      }
    }));
    return;
  }

  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    if (saved) {
      event.waitUntil(fresh.catch(() => {}));
      return saved;
    }
    return fresh;
  }));
});
