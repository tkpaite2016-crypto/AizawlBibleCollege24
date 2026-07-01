import { supabase } from './supabase';
import { getPushToken, onPushMessage, isPushSupported } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function isNotificationSupported(): Promise<boolean> {
  return await isPushSupported();
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!VAPID_KEY) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not set; push notifications disabled.');
    return false;
  }

  const token = await getPushToken(VAPID_KEY);
  if (!token) return false;

  // Upsert the token — unique constraint on (user_id, fcm_token) prevents duplicates
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, fcm_token: token, device_type: 'web' },
      { onConflict: 'user_id,fcm_token' }
    );

  if (error) {
    console.error('Failed to save push subscription:', error.message);
    return false;
  }

  return true;
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!VAPID_KEY) return false;

  const token = await getPushToken(VAPID_KEY);
  if (!token) return false;

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('fcm_token', token);

  if (error) {
    console.error('Failed to remove push subscription:', error.message);
    return false;
  }

  return true;
}

export async function listenForForegroundPush(callback: (payload: any) => void): Promise<void> {
  await onPushMessage(callback);
}
