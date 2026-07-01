/*
 * firebase-messaging-sw.js
 * Service worker for Firebase Cloud Messaging (FCM) push notifications.
 * Must be at the root scope so it can receive push events for the entire site.
 */

// Import Firebase scripts from CDN (pinned versions)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD1ni9qqpTyHgW-U_jxAgdqKm6CgXPEo2g',
  authDomain: 'aizawlbiblecollege.firebaseapp.com',
  projectId: 'aizawlbiblecollege',
  storageBucket: 'aizawlbiblecollege.firebasestorage.app',
  messagingSenderId: '115286874000',
  appId: '1:115286874000:web:ffc1c6b927bb86495ac515',
  measurementId: 'G-KK313VH8BX',
});

const messaging = firebase.messaging();

// Handle background push notifications (when the site is closed)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.data?.title || payload.notification?.title || 'Aizawl Bible College';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: {
      click_action: payload.data?.click_action || '/',
      ...payload.data,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app at the target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if one is open
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle push events directly (fallback for browsers that don't route through FCM)
self.addEventListener('push', (event) => {
  if (event.data) {
    const payload = event.data.json();
    const notificationTitle = payload.data?.title || payload.notification?.title || 'Aizawl Bible College';
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        click_action: payload.data?.click_action || '/',
        ...payload.data,
      },
    };
    event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions));
  }
});
