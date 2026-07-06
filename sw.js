/* Dogeared service worker — offline app shell caching */
const CACHE = "dogeared-v17";
const CORE_SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/styles.css",
  "./js/icons.js", "./js/catalog.js", "./js/store.js", "./js/cloud-sync.js",
  "./js/firebase-config.js", "./js/api.js", "./js/app.js",
  "./icons/logo.png", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/favicon.png", "./icons/apple-touch-icon.png",
  "./icons/avatar-night-owl.png", "./icons/avatar-bookworm.png", "./icons/avatar-speed-reader.png",
  "./icons/avatar-romantic.png", "./icons/avatar-detective.png", "./icons/avatar-dreamer.png"
];
const OPTIONAL_SHELL = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(CORE_SHELL).then(() =>
        Promise.all(OPTIONAL_SHELL.map((url) => c.add(url).catch(() => {})))
      )
    ).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match("./index.html")))
    );
  } else {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});

/* ---------------- session-timer notification actions ----------------
   Handles taps on the "reading session" / "still reading?" notifications,
   whether or not the app is currently open. If a window is already open,
   we message it directly. If not, we open one with the action encoded in
   the URL so app.js can pick it up on cold boot (postMessage timing after
   clients.openWindow isn't reliable across browsers). */
self.addEventListener("notificationclick", (event) => {
  const action = event.action || "open";
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list[0];
      if (client) {
        client.postMessage({ type: "notification-action", action });
        return client.focus();
      }
      return self.clients.openWindow(`./index.html?notif=${action}`);
    })
  );
});
