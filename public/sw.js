/**
 * Suci service worker.
 *
 * The app holds all of its data in localStorage and talks to no server, so
 * "offline" is the normal case, not a degraded one — the only thing that ever
 * needs fetching is the shell itself. This worker precaches every route on
 * install so a cold start with no signal behaves exactly like a warm one.
 *
 * Two rules it must not break:
 *
 *   1. Never cache /s/ — those are Mode Suami share pages. A cached copy would
 *      outlive the token that authorised it and could show a stale status to
 *      someone the user has already cut off.
 *   2. Never cache anything with a query string that could carry a date or
 *      other personal parameter into the cache key.
 *
 * Bump CACHE_VERSION on any change here; the old cache is dropped on activate.
 */

const CACHE_VERSION = "suci-v8";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const RSC_CACHE = `${CACHE_VERSION}-rsc`;

const KEEP = [SHELL_CACHE, ASSET_CACHE, RSC_CACHE];

/** Every route the app can land on, so a cold offline start always works. */
const ROUTES = [
  "/",
  "/onboarding",
  "/catat",
  "/kalender",
  "/ibadah",
  "/ibadah/mandi-wajib",
  "/ibadah/qadha-shalat",
  "/ibadah/qadha-puasa",
  "/edukasi",
  "/edukasi/dasar",
  "/edukasi/istihadhah",
  "/edukasi/amalan",
  "/edukasi/glosarium",
  "/edukasi/tanya-jawab",
  "/edukasi/ikhtilaf",
  "/edukasi/baligh",
  "/edukasi/ibu",
  "/edukasi/ibu/menyusui",
  "/edukasi/menopause",
  "/pengaturan",
  "/pengaturan/kehamilan",
  "/pengaturan/data-saya",
  "/pengaturan/suami",
  "/kebijakan-privasi",
  "/hapus-data",
];

const STATIC = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

/**
 * Pulls every /_next/static/ reference out of a page's HTML.
 *
 * Caching pages alone is not enough: each route pulls its own hashed chunks,
 * and a chunk that was never fetched while online is missing when it is needed.
 * Reading the references straight out of the shell keeps the worker
 * self-contained — no build step has to hand it a manifest.
 */
function extractAssets(html) {
  const found = new Set();
  const pattern = /\/_next\/static\/[A-Za-z0-9._\-/]+/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = match[0];
    // Trailing punctuation from JSON escaping sneaks into the match.
    if (/\.(js|css|woff2?|json)$/.test(url)) found.add(url);
  }
  return [...found];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      const assets = await caches.open(ASSET_CACHE);
      const referenced = new Set();

      // Individually, so one failure cannot fail the whole install.
      await Promise.all(
        [...ROUTES, ...STATIC].map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (!res.ok) return;
            const isPage = ROUTES.includes(url);
            if (isPage) {
              const html = await res.clone().text();
              for (const asset of extractAssets(html)) referenced.add(asset);
            }
            await shell.put(url, res);
          } catch {
            // Offline during install; the runtime handler will fill this in.
          }
        }),
      );

      await Promise.all(
        [...referenced].map(async (url) => {
          try {
            if (await assets.match(url)) return;
            const res = await fetch(url);
            if (res.ok) await assets.put(url, res);
          } catch {
            // Missing one chunk should not fail the install.
          }
        }),
      );

      // Next's client router fetches an RSC payload for each in-app
      // navigation. Without these cached, every offline tab tap falls back to
      // a full browser navigation — which remounts the app and re-prompts for
      // the PIN. Offline is this app's normal state, so that has to work.
      const rsc = await caches.open(RSC_CACHE);
      await Promise.all(
        ROUTES.map(async (url) => {
          try {
            const res = await fetch(url, { headers: { RSC: "1" } });
            if (res.ok) await rsc.put(url, res);
          } catch {
            // Falls back to a full navigation, which is still served offline.
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Share pages are per-token and must always be resolved fresh. */
function isShareRoute(url) {
  return url.pathname === "/s" || url.pathname.startsWith("/s/");
}

/** Next's build output is content-hashed, so it can be cached forever. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/**
 * A client-router payload request rather than a document request. Next marks
 * these with an `RSC` header and a cache-busting `_rsc` query parameter.
 */
function isRscRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

/**
 * Network first, so online behaviour is untouched — including the partial
 * payloads Next returns for prefetches. The cached full payload is only used
 * when the network is gone, where the alternative is a full page reload.
 */
async function networkThenRsc(request, url) {
  try {
    const res = await fetch(request);
    if (res.ok && !request.headers.get("Next-Router-Prefetch")) {
      const cache = await caches.open(RSC_CACHE);
      cache.put(url.pathname, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(RSC_CACHE);
    const hit = await cache.match(url.pathname);
    if (hit) return hit;
    // No payload to serve: let the router fall back to a full navigation,
    // which the shell cache can still satisfy.
    return new Response(null, { status: 504 });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isShareRoute(url)) return; // straight to the network, never stored
  // The share API answers with somebody's current status and with whether this
  // deployment can store one. A stale copy of either would be a lie told
  // confidently, so it never enters a cache.
  if (url.pathname.startsWith("/api/")) return;

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (isRscRequest(request, url)) {
    event.respondWith(networkThenRsc(request, url));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(event, request, url));
    return;
  }

  if (STATIC.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

/**
 * Stale-while-revalidate for pages: serve the cached shell immediately, then
 * refresh it in the background. The query string is dropped from the cache key
 * so /catat?tanggal=… reuses /catat rather than filling the cache with dates.
 */
async function navigationHandler(event, request, url) {
  const key = url.pathname;
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(key);

  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    // Keep the worker alive for the background refresh, which is the whole
    // point of stale-while-revalidate.
    event.waitUntil(network);
    return cached;
  }

  const res = await network;
  if (res) return res;

  // Never seen this route and no network: fall back to the app root, which the
  // client router can then navigate from.
  return (
    (await cache.match("/")) ??
    new Response(
      "<!doctype html><meta charset=utf-8><title>Suci</title><p>Suci belum sempat disimpan untuk dipakai offline. Sambungkan internet sebentar, lalu buka lagi.",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    )
  );
}
