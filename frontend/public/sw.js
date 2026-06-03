// sw.js - service worker minimale per Pasto.
//
// Strategia:
// - HTML/navigation network-first: dopo un deploy la PWA prende subito la nuova shell.
// - Asset statici stale-while-revalidate: avvio rapido, cache aggiornata in background.
// - API lasciate alla rete: niente cache per mutation o risposte dinamiche.
//
// CACHE_VERSION viene sostituito da build.mjs con l'id del deploy.

const CACHE_VERSION = "pasto-dev";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const FONTS_CACHE = `${CACHE_VERSION}-fonts`;
const BUILD_ASSETS = [];

const SHELL_ASSETS = [
  "/index.html",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  ...BUILD_ASSETS,
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
    (async () => {
      const keys = await caches.keys();
      const oldPastoCaches = keys.filter((key) => key.startsWith("pasto-") && !key.startsWith(CACHE_VERSION));
      await Promise.all(oldPastoCaches.map((key) => caches.delete(key)));
      await self.clients.claim();

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(
        clients.map(async (client) => {
          client.postMessage({ type: "PASTO_SW_READY", version: CACHE_VERSION });
          if (oldPastoCaches.length > 0 && "navigate" in client) {
            try {
              await client.navigate(client.url);
            } catch (e) {
              // Alcuni browser mobile possono ignorare navigate(): l'app usera' il fallback in index.html.
            }
          }
        }),
      );
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PASTO_SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API: solo network (no cache).
  if (url.pathname.startsWith("/api/")) {
    return; // lascia fare al browser
  }

  if (url.origin === self.location.origin && event.request.method === "GET") {
    if (event.request.mode === "navigate") {
      event.respondWith(networkFirstNavigation(event.request));
      return;
    }

    if (url.pathname === "/sw.js") {
      return;
    }
  }

  // Google Fonts: stale-while-revalidate.
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(event.request, FONTS_CACHE));
    return;
  }

  // Same-origin: asset rapidi, ma aggiornati in background.
  if (url.origin === self.location.origin && event.request.method === "GET") {
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) {
      await cache.put("/index.html", res.clone());
      await cache.put("/", res.clone());
    }
    return res;
  } catch (e) {
    const cached = await cache.match("/index.html") || await cache.match("/");
    if (cached) return cached;
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
