// Safe Service Worker
// This worker does NOT intercept network requests (fetch), preventing 404s caused by bad caching or auth headers.
// It exists solely to satisfy PWA installation requirements.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// No fetch listener = Direct Network Access
