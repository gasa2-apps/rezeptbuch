/* Mein Rezeptbuch: Offline-Cache */
const VERSION = "rezeptbuch-v8";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./rochen-192.png", "./rochen-512.png", "./rochen-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // App selbst: sofort aus dem Cache, im Hintergrund aktualisieren
  // Seite und Manifest: zuerst frisch aus dem Netz, offline aus dem Cache
  if (url.origin === location.origin && (req.mode === "navigate" || url.pathname.endsWith(".webmanifest"))) {
    const key = req.mode === "navigate" ? "./index.html" : req;
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        try {
          const res = await fetch(req, { cache: "no-cache" });
          if (res.ok) cache.put(key, res.clone());
          return res;
        } catch (err) {
          return (await cache.match(key)) || Response.error();
        }
      })
    );
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const key = req.mode === "navigate" ? "./index.html" : req;
        const cached = await cache.match(key);
        const fresh = fetch(req).then((res) => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }
  // Schriften von Google: einmal laden, dann offline aus dem Cache
  if (url.hostname === "__none__" || url.hostname === "__none__") {
    e.respondWith(
      caches.open(VERSION + "-fonts").then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try { const res = await fetch(req); cache.put(req, res.clone()); return res; } catch (err) { return new Response("", { status: 504 }); }
      })
    );
  }
});
