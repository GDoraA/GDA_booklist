self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("gda-cache").then(cache => {
      return cache.addAll([
        "/GDA_booklist/index.html",
        "/GDA_booklist/styles.css",
        "/GDA_booklist/app.js",
        "/GDA_booklist/manifest.json",
        "/GDA_booklist/assets/icon-192.png",
        "/GDA_booklist/assets/icon-512.png"
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
