const CACHE = "anoma-v3";
const ASSETS = [
  "/anoma-spa-ghpages/",
  "/anoma-spa-ghpages/index.html",
  "/anoma-spa-ghpages/styles.css",
  "/anoma-spa-ghpages/main.js",
  "/anoma-spa-ghpages/icon-192.png",
  "/anoma-spa-ghpages/icon-512.png",
  "/anoma-spa-ghpages/og-image.jpg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/anoma-spa-ghpages/index.html"))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request))
    );
  }
});



