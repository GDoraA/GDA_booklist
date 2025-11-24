self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("gda-cache").then(cache => {
      return cache.addAll([
        "/index.html",
        "/styles.css",
        "/app.js"
        "/assets/icon-192.png",
        "/assets/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
