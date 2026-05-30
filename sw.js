// Minimal service worker for PWA installability + basic offline support.
// Caches the two pages and the icon/manifest at install time; serves from
// cache when available, falls back to network. Bump CACHE on content changes.

const CACHE = "missaquarius-org-v3";
const ASSETS = [
    "/",
    "/bodhisattva.html",
    "/sw-register.js",
    "/manifest.webmanifest",
    "/icon.svg",
    "/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
    );
    // No skipWaiting() here: a new worker stays in "waiting" so sw-register.js
    // can prompt the user to refresh, then activates on SKIP_WAITING.
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k !== CACHE)
                        .map((k) => caches.delete(k))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    // Cache-first for same-origin GETs; network fallback otherwise.
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((resp) => {
                // Cache successful navigations + assets we ship.
                if (resp.ok && (resp.type === "basic" || resp.type === "default")) {
                    const copy = resp.clone();
                    caches.open(CACHE).then((c) => c.put(event.request, copy));
                }
                return resp;
            });
        })
    );
});
