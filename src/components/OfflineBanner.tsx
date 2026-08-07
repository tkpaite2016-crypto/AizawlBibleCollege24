import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Loader } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { OfflineManager } from '../lib/offlineManager';

/**
 * OfflineBanner — shows a fixed-position banner at the top of the screen
 * when the device is offline, including the count of queued mutations.
 *
 * Disappears automatically when connectivity is restored. Uses Tailwind CSS
 * for styling and Lucide React for icons.
 */
export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [queueCount, setQueueCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    const manager = OfflineManager.getInstance();
    const unsubscribe = manager.onQueueChange(setQueueCount);
    return unsubscribe;
  }, []);

  if (isOnline && queueCount === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    await OfflineManager.getInstance().syncQueue();
    setSyncing(false);
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] transition-transform duration-300 ${
        !isOnline ? 'translate-y-0' : queueCount > 0 ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className={`px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium text-white shadow-lg ${
        !isOnline ? 'bg-red-600' : 'bg-amber-500'
      }`}>
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>You are offline. Changes will be saved and synced when you reconnect.</span>
            {queueCount > 0 && (
              <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                {queueCount} pending
              </span>
            )}
          </>
        ) : (
          <>
            {syncing ? (
              <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{syncing ? 'Syncing your changes...' : `${queueCount} change${queueCount !== 1 ? 's' : ''} pending sync`}</span>
            {!syncing && (
              <button
                onClick={handleSync}
                className="ml-2 bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors"
              >
                Sync now
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
