var _CACHE_NAME_PREFIX = 'CACHANDRA';

var _calculateHash = function (input) {
  input = input.toString();
  var hash = 0, i, chr, len = input.length;
  if (len === 0) {
    return hash;
  }
  for (i = 0; i < len; i++) {
    chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

self.addEventListener('message', event => {
  if (event.data.action === 'set-settings') {
    _parseSettingsAndCache(event.data.settings);
  }
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      var fetchRequest = event.request.clone();

      return fetch(fetchRequest).then(async response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;

        var responseToCache = response.clone();

        let cache = await caches.open(_CACHE_NAME_PREFIX);
        cache.put(event.request, responseToCache);

        return response;
      }).catch(async () => {

        let response = await caches.match(event.request);
        if (response) {
          return response;
        }
        if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
          return await caches.match('sw-offline-content');
        }
      });
    })
  );
});

var _parseSettingsAndCache = async settings => {
  if (navigator.onLine) {
    const newCacheName = `${_CACHE_NAME_PREFIX}-
                        ${(settings['cache-version'] ? (settings['cache-version'] + '-') : '')}
                        ${_calculateHash(settings['content'] + settings['content-url'] + settings['assets'])}`;

    const cache = await caches.open(newCacheName);

    if (settings['assets']) {
      cache.addAll(settings['assets'].map(url => new Request(url, { mode: 'no-cors' })));
    }

    if (settings['content-url']) {
      const response = await fetch(settings['content-url'], { mode: 'no-cors' });
      await cache.put('sw-offline-content', response);
    }

    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.startsWith(_CACHE_NAME_PREFIX) && newCacheName !== cacheName) {
          return caches.delete(cacheName);
        }
      })
    );
  }
};

var _buildResponse = function (content) {
  return new Response(content, {
    headers: { 'Content-Type': 'text/html' }
  });
}