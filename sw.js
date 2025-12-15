// This Service Worker is designed to UNREGISTER itself immediately.
// This fixes the issue where an old SW might be intercepting requests and causing 404s.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Force unregistration
  self.registration.unregister()
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      // Force reload all open pages to ensure they use the network directly
      clients.forEach((client) => client.navigate(client.url));
    });
});