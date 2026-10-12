/* JPL Tracker service worker: offline-first core, netwerk-eerst voor pagina's */
const CACHE = 'jpl-v87';
const CORE = ['./', './index.html', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './manifest.webmanifest', './data.js', './app.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  /* 'nieuwe versie'-melding alleen bij een echte update (er was al een oudere cache), niet bij eerste bezoek */
  e.waitUntil((async () => {
    const ks = await caches.keys();
    const hadOld = ks.some(k => k !== CACHE);
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    if (hadOld) {
      const cs = await self.clients.matchAll({ type: 'window' });
      cs.forEach(c => { try { c.postMessage({ type: 'SW_UPDATED' }); } catch (er) {} });
    }
  })());
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.pathname.indexOf('/api/') === 0) return;   /* live-API: nooit cachen */
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   /* o.a. Abacus-API: niet onderscheppen */
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put('./', cp)); return r;
    }).catch(() => caches.match('./')));
    return;
  }
  /* scripts, data en manifest: netwerk eerst (anders blijven oude scores/logica hangen) */
  if (/\.(js|json|webmanifest|css)$/.test(u.pathname)) {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  /* overige assets (iconen, afbeeldingen): cache eerst */
  e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return r;
  })));
});

/* v74-pre.57: web-push (tab gesloten) — push zonder payload, teksten uit /api/push-last */
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let t = '\u26bd Goal in de JPL!', b = 'Bekijk de live stand op JPL Tracker';
    try {
      const r = await fetch('/api/push-last', { cache: 'no-store' });
      const d = await r.json();
      if (d && d.ok && d.t) { t = d.t; b = d.b || b; }
    } catch (er) {}
    await self.registration.showNotification(t, { body: b, icon: '/icon-192.png', tag: 'jpl-goal', renotify: true });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { try { c.focus(); return c; } catch (er) {} }
    return clients.openWindow('/');
  }));
});
