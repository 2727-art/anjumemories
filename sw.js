// Service Worker: caches game assets locally so the ~180MB of images/audio
// download only once. Cache-first for immutable assets; HTML stays network-only.
// Bump CACHE_NAME to invalidate everything after replacing existing asset files
// (new ?v= query strings get new cache entries automatically without a bump).
const CACHE_PREFIX = "mirage-labyrinth-assets";
const CACHE_NAME = `${CACHE_PREFIX}-v1`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isCacheableAssetRequest(request) {
  if (request.method !== "GET") {
    return false;
  }
  // Partial responses must not be cached or served whole.
  if (request.headers.has("range")) {
    return false;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    return false;
  }
  if (pathname === "/sw.js" || pathname.endsWith("/sw.js")) {
    return false;
  }
  return (
    pathname.includes("/画像/") ||
    pathname.includes("/音声/") ||
    pathname.includes("/vendor/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".mp3") ||
    pathname.endsWith(".ogg") ||
    pathname.endsWith(".wav")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!isCacheableAssetRequest(request)) {
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    const response = await fetch(request);
    if (response.status === 200 && (response.type === "basic" || response.type === "default")) {
      // Quota errors just mean this asset streams from network next time too.
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  })());
});
