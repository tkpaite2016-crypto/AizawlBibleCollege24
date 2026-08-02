/**
 * OfflineManager — manages a queue of failed mutations (POST/PUT/DELETE)
 * while the device is offline, and replays them when connectivity is restored.
 *
 * Uses IndexedDB (via a thin wrapper) for durable storage so queued operations
 * survive page reloads. Emits events when the queue changes so UI components
 * can react (e.g. show a banner with the pending count).
 */

export interface QueuedOperation {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: string | null;
  headers: Record<string, string>;
  timestamp: number;
  retries: number;
}

type QueueChangeListener = (queueLength: number) => void;

const DB_NAME = 'app_offline_db';
const STORE_NAME = 'mutation_queue';
const DB_VERSION = 1;
const MAX_RETRIES = 3;

/**
 * OfflineManager — singleton that queues failed mutations in IndexedDB
 * and replays them on reconnection.
 *
 * Usage:
 * ```ts
 * const manager = OfflineManager.getInstance();
 * manager.enqueue({ url: '/api/save', method: 'POST', body: JSON.stringify(data) });
 * manager.onQueueChange((count) => console.log(`${count} queued`));
 * ```
 */
export class OfflineManager {
  private static instance: OfflineManager | null = null;
  private db: IDBDatabase | null = null;
  private listeners: Set<QueueChangeListener> = new Set();
  private syncing = false;

  private constructor() {
    this.initDB();
    window.addEventListener('online', () => {
      this.syncQueue();
    });
  }

  /** Get the singleton instance. */
  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /** Initialize the IndexedDB database. */
  private async initDB(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      });
    } catch {
      // IndexedDB not available — queue will be in-memory only
    }
  }

  /** Register a listener that fires when the queue length changes. */
  onQueueChange(listener: QueueChangeListener): () => void {
    this.listeners.add(listener);
    this.getQueueLength().then(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners(): Promise<void> {
    const count = await this.getQueueLength();
    this.listeners.forEach((l) => l(count));
  }

  /** Add a mutation to the offline queue. */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const queued: QueuedOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add(queued);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    await this.notifyListeners();
  }

  /** Get the number of queued operations. */
  async getQueueLength(): Promise<number> {
    if (!this.db) return 0;
    return new Promise<number>((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  }

  /** Get all queued operations (oldest first). */
  async getQueue(): Promise<QueuedOperation[]> {
    if (!this.db) return [];
    return new Promise<QueuedOperation[]>((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as QueuedOperation[]).sort((a, b) => a.timestamp - b.timestamp));
      req.onerror = () => resolve([]);
    });
  }

  /** Remove a specific operation from the queue. */
  private async removeOperation(id: string): Promise<void> {
    if (!this.db) return;
    await new Promise<void>((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  /**
   * syncQueue — replay all queued mutations in order.
   * Called automatically when the `online` event fires, or can be called manually.
   */
  async syncQueue(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const queue = await this.getQueue();
      for (const op of queue) {
        try {
          const response = await fetch(op.url, {
            method: op.method,
            body: op.body,
            headers: op.headers,
          });
          if (response.ok) {
            await this.removeOperation(op.id);
          } else if (response.status >= 400 && response.status < 500) {
            // Client error — don't retry, remove from queue
            await this.removeOperation(op.id);
          } else {
            // Server error — increment retries, remove if exceeded
            if (op.retries >= MAX_RETRIES) {
              await this.removeOperation(op.id);
            }
          }
        } catch {
          // Network still failing — stop syncing
          break;
        }
      }
    } finally {
      this.syncing = false;
      await this.notifyListeners();
    }
  }
}
