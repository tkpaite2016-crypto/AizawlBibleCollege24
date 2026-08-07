/**
 * Firebase Analytics helper — provides a safe wrapper around Firebase Analytics
 * that never throws if analytics is unavailable (e.g. in unsupported environments).
 */

let analyticsInstance: ReturnType<typeof import('firebase/analytics').getAnalytics> | null = null;
let initAttempted = false;

async function getAnalyticsInstance(): Promise<typeof analyticsInstance> {
  if (initAttempted) return analyticsInstance;
  initAttempted = true;

  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (!supported) return null;

    const { initializeApp } = await import('firebase/app');
    const firebaseConfig = {
      apiKey: 'AIzaSyD1ni9qqpTyHgW-U_jxAgdqKm6CgXPEo2g',
      authDomain: 'aizawlbiblecollege.firebaseapp.com',
      projectId: 'aizawlbiblecollege',
      storageBucket: 'aizawlbiblecollege.firebasestorage.app',
      messagingSenderId: '115286874000',
      appId: '1:115286874000:web:ffc1c6b927bb86495ac515',
      measurementId: 'G-KK313VH8BX',
    };
    const app = initializeApp(firebaseConfig);
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch {
    return null;
  }
}

/**
 * Log a custom analytics event. Fire-and-forget — never throws.
 * @param eventName - The event name (max 40 chars, alphanumeric + underscores).
 * @param params - Optional event parameters.
 */
export async function logAnalyticsEvent(
  eventName: string,
  params?: Record<string, unknown>,
): Promise<void> {
  try {
    const analytics = await getAnalyticsInstance();
    if (!analytics) return;
    const { logEvent } = await import('firebase/analytics');
    logEvent(analytics, eventName, params);
  } catch {
    // Analytics is non-critical — silently skip
  }
}
