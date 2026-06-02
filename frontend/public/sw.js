// sw.js — service worker minimale per Pasto.
//
// Strategia:
// - Precache dello "shell" (index.html, bundle.js, manifest, icone) per avvio offline.
// - Network-first per le chiamate API (/api/*) → cache solo se la rete fallisce
//   non ha senso (ci sono mutation). Quindi /api/* NON viene cachato.
// - Stale-while-revalidate per i font Google Fonts.
//
// Versionamento: cambia CACHE_VERSION quando vuoi forzare l'invalidazione.

const CACHE_VERSION = "pasto-v3-profile-fastboot";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const FONTS_CACHE = `${CACHE_VERSION}-fonts`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Non blocchiamo l'install se manca qualche asset (es. icone non ancora generate).
      Promise.allSettled(SHELL_ASSETS.map((u) => cache.add(u))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API: solo network (no cache).
  if (url.pathname.startsWith("/api/")) {
    return; // lascia fare al browser
  }

  // Google Fonts: stale-while-revalidate.
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(event.request, FONTS_CACHE));
    return;
  }

  // Same-origin: cache-first per gli asset dello shell (HTML, JS, immagini).
  if (url.origin === self.location.origin && event.request.method === "GET") {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    // Offline e niente in cache: prova a tornare index.html come fallback per le SPA route.
    if (request.mode === "navigate") {
      const fallback = await cache.match("/index.html");
      if (fallback) return fallback;
    }
    throw e;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
