const BASE_URL = self.location.origin;
const DEFAULT_ICON = '/images/favicon.ico';
const DEFAULT_BADGE = '/images/favicon.png';
const TYPE_ICONS = {
  message: '/images/notifications/message.svg',
  conversation_started: '/images/notifications/message.svg',
  success: '/images/notifications/success.svg',
  warning: '/images/notifications/warning.svg',
  error: '/images/notifications/error.svg',
  info: '/images/notifications/info.svg',
};

function getNotificationIcon(type, fallback) {
  return fallback || TYPE_ICONS[type] || DEFAULT_ICON;
}

function getNotificationTitle(payload) {
  const labels = {
    message: 'Message',
    conversation_started: 'New chat',
    success: 'Success',
    warning: 'Warning',
    error: 'Action needed',
    info: 'Update',
  };
  const type = payload.data?.type || payload.type;
  const label = labels[type];
  return label && payload.title && !payload.title.startsWith(`${label}:`)
    ? `${label}: ${payload.title}`
    : payload.title;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: 'notification',
    renotify: false,
    requireInteraction: false,
    data: {
      url: '/notifications',
      replyUrl: '/notifications',
    },
    actions: [
      { action: 'open', title: 'Open' },
    ],
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: getNotificationIcon(payload.data?.type || payload.type, payload.icon),
    badge: payload.badge || DEFAULT_BADGE,
    image: payload.image,
    tag: payload.tag || payload.data?.notificationId || 'notification',
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    timestamp: payload.timestamp || Date.now(),
    data: {
      url: payload.data?.url || payload.url || '/notifications',
      notificationId: payload.data?.notificationId,
      ...payload.data,
    },
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : [],
  };

  event.waitUntil(self.registration.showNotification(getNotificationTitle(payload), options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrl = event.action === 'reply'
    ? event.notification.data?.replyUrl || event.notification.data?.url
    : event.notification.data?.url;

  const targetUrl = new URL(
    actionUrl || '/notifications',
    BASE_URL
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const sameOriginClient = clientList.find((client) => {
          const clientUrl = new URL(client.url);
          return clientUrl.origin === BASE_URL;
        });

        if (sameOriginClient) {
          sameOriginClient.postMessage({
            type: 'NOTIFICATION_CLICKED',
            notificationId: event.notification.data?.notificationId,
            url: targetUrl,
            action: event.action || 'open',
          });
          return sameOriginClient.focus();
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
