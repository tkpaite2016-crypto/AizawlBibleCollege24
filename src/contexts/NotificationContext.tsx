import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { supabase, type Notification } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { subscribeToPush, unsubscribeFromPush, listenForForegroundPush, isNotificationSupported } from '../lib/push';

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  pushSupported: boolean;
  pushEnabled: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<boolean>;
  refresh: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    const notifs = (data as Notification[]) ?? [];
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [profile?.id]);

  // Load notifications + set up realtime subscription
  useEffect(() => {
    if (!profile?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((c) => c + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          setUnreadCount((c) =>
            updated.is_read ? Math.max(0, c - 1) : c
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, loadNotifications]);

  // Check push support + whether already subscribed
  useEffect(() => {
    let mounted = true;
    (async () => {
      const supported = await isNotificationSupported();
      if (!mounted) return;
      setPushSupported(supported);

      if (supported && Notification.permission === 'granted' && profile?.id) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', profile.id)
          .limit(1);
        if (mounted) setPushEnabled((data?.length ?? 0) > 0);
      } else {
        if (mounted) setPushEnabled(false);
      }
    })();
    return () => { mounted = false; };
  }, [profile?.id]);

  // Listen for foreground push messages
  useEffect(() => {
    listenForForegroundPush((payload) => {
      loadNotifications();
    });
  }, [loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [profile?.id]);

  const enablePush = useCallback(async () => {
    if (!profile?.id) return false;
    const success = await subscribeToPush(profile.id);
    setPushEnabled(success);
    return success;
  }, [profile?.id]);

  const disablePush = useCallback(async () => {
    if (!profile?.id) return false;
    const success = await unsubscribeFromPush(profile.id);
    if (success) setPushEnabled(false);
    return success;
  }, [profile?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        pushSupported,
        pushEnabled,
        markAsRead,
        markAllAsRead,
        enablePush,
        disablePush,
        refresh: loadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
