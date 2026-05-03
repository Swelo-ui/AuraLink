self.addEventListener('push', function(event) {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'AuraLink', body: event.data.text() };
    }

    const options = {
      body: data.body,
      icon: '/auralink-icon.jpeg',
      badge: '/auralink-icon.jpeg',
      data: data.url ? { url: data.url } : undefined,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'AuraLink', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
