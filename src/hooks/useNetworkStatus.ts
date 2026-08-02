import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType: string;
}

/**
 * useNetworkStatus — tracks the browser's online/offline state.
 *
 * Returns `{ isOnline, wasOffline, connectionType }`. When the connection
 * is restored after being offline, a callback can be invoked (e.g. to show
 * a toast). The `wasOffline` flag stays `true` until the next offline event,
 * so callers can distinguish "was offline, just reconnected" from "always online."
 *
 * @param onReconnect - Optional callback fired when the connection is restored.
 */
export function useNetworkStatus(onReconnect?: () => void): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    onReconnectRef.current?.();
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect connection type via the Network Information API if available
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    };
    if (nav.connection?.effectiveType) {
      setConnectionType(nav.connection.effectiveType);
      const updateType = () => setConnectionType(nav.connection?.effectiveType ?? 'unknown');
      nav.connection.addEventListener?.('change', updateType);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        nav.connection?.removeEventListener?.('change', updateType);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline, connectionType };
}
