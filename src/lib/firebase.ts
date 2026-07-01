import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { getAnalytics, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyD1ni9qqpTyHgW-U_jxAgdqKm6CgXPEo2g',
  authDomain: 'aizawlbiblecollege.firebaseapp.com',
  projectId: 'aizawlbiblecollege',
  storageBucket: 'aizawlbiblecollege.firebasestorage.app',
  messagingSenderId: '115286874000',
  appId: '1:115286874000:web:ffc1c6b927bb86495ac515',
  measurementId: 'G-KK313VH8BX',
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

async function ensureMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging;
  const supported = await isSupported();
  if (!supported) return null;

  if (!app) app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);

  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics requires a supported environment; silently skip if unavailable
  }

  return messaging;
}

export async function getPushToken(vapidKey: string): Promise<string | null> {
  const m = await ensureMessaging();
  if (!m) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const token = await getToken(m, { vapidKey });
  return token;
}

export async function onPushMessage(callback: (payload: any) => void): Promise<void> {
  const m = await ensureMessaging();
  if (!m) return;
  onMessage(m, callback);
}

export async function isPushSupported(): Promise<boolean> {
  const supported = await isSupported();
  return supported && 'serviceWorker' in navigator && 'PushManager' in window;
}
