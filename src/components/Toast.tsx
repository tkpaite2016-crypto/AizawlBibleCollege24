import {
  createContext, useContext, useState, useCallback, useRef, type ReactNode,
} from 'react';
import {
  CheckCircle, AlertCircle, AlertTriangle, Info, X, Loader,
} from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 5000;

/**
 * ToastProvider — context provider that manages a stack of toast notifications.
 * Wrap your app with this provider to enable the `useToast` hook.
 *
 * Usage:
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }): string => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = toast.duration ?? DEFAULT_DURATION;
      const item: ToastItem = { ...toast, id, duration };
      setToasts((prev) => [...prev, item]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const success = useCallback((title: string, message?: string) => show({ type: 'success', title, message }), [show]);
  const error = useCallback((title: string, message?: string) => show({ type: 'error', title, message }), [show]);
  const warning = useCallback((title: string, message?: string) => show({ type: 'warning', title, message }), [show]);
  const info = useCallback((title: string, message?: string) => show({ type: 'info', title, message }), [show]);

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * useToast — access the toast notification system.
 * Must be used within a `ToastProvider`.
 *
 * @returns `{ show, dismiss, success, error, warning, info, toasts }`
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/** ToastContainer — renders the stack of toasts in the bottom-right corner. */
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

/** ToastCard — a single toast notification card. */
function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { Icon, iconBg, iconColor, borderClass } = getToastVisuals(toast.type);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg border ${borderClass} animate-slide-in-right`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-900">{toast.title}</p>
        {toast.message && <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Determine icon and colors for a given toast type. */
function getToastVisuals(type: ToastType): {
  Icon: typeof CheckCircle;
  iconBg: string;
  iconColor: string;
  borderClass: string;
} {
  switch (type) {
    case 'success':
      return { Icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-600', borderClass: 'border-green-200' };
    case 'error':
      return { Icon: AlertCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600', borderClass: 'border-red-200' };
    case 'warning':
      return { Icon: AlertTriangle, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', borderClass: 'border-amber-200' };
    case 'info':
      return { Icon: Info, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', borderClass: 'border-blue-200' };
  }
}

/** LoadingToast — a non-dismissible toast shown during async operations. */
export function LoadingToast({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-lg border border-slate-200 animate-slide-in-right">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-navy-100">
        <Loader className="w-5 h-5 text-navy-600 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-navy-900">{title}</p>
    </div>
  );
}
