/* シンプルTD Service Worker — オフライン対応＆高速化 */
const CACHE = "simpletd-v1";
// 起動に必須のものを事前キャッシュ（相対パス：GitHub Pages のサブパスでも動く）
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/app-192.png",
  "./icons/app-512.png",
  "./icons/app-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 別オリジン（Firebase / Google Fonts / gtag など）はそのまま通す
  if (url.origin !== location.origin) return;

  // ページ遷移：ネット優先（最新を取得）→ 失敗時はキャッシュ or index.html
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
    );
    return;
  }

  // それ以外の同一オリジン資産：キャッシュ優先 → なければ取得してキャッシュ
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      if (r && r.status === 200 && r.type === "basic") {
        const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp));
      }
      return r;
    }).catch(() => m))
  );
});
