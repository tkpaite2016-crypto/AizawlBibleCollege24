import { type ReactNode } from 'react';
import {
  WifiOff, AlertCircle, ShieldAlert, AlertTriangle, RefreshCw, Loader,
} from 'lucide-react';
import { AppError } from '../lib/errorHandler';

interface ErrorMessageProps {
  error: AppError;
  /** Optional retry callback. If provided, a "Retry" button is shown. */
  onRetry?: () => void;
  /** Optional title override. Defaults to a message-appropriate title. */
  title?: string;
  /** Additional actions rendered after the retry button. */
  children?: ReactNode;
  /** Compact mode — smaller padding, no icon circle. */
  compact?: boolean;
}

/**
 * ErrorMessage — displays a user-friendly error card with an appropriate icon
 * based on the error type, the error message (never stack traces), and an
 * optional "Retry" button for recoverable errors.
 *
 * Icons are chosen by error code:
 * - `NETWORK_ERROR` / `OFFLINE_ERROR` → WifiOff
 * - `AUTH_ERROR` → ShieldAlert
 * - `API_4xx` → AlertCircle
 * - `API_5xx` → AlertTriangle
 * - `VALIDATION_ERROR` → AlertCircle
 *
 * Usage:
 * ```tsx
 * {error && <ErrorMessage error={error} onRetry={() => refetch()} />}
 * ```
 */
export default function ErrorMessage({ error, onRetry, title, children, compact }: ErrorMessageProps) {
  const { Icon, iconColor, bgColor, defaultTitle } = getErrorVisuals(error);
  const displayTitle = title ?? defaultTitle;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${bgColor} animate-fade-in`}>
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{displayTitle}</p>
          <p className="text-xs text-slate-600">{error.message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border ${bgColor} animate-fade-in`}>
      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-serif font-bold text-navy-900 mb-1.5">{displayTitle}</h3>
      <p className="text-sm text-slate-600 max-w-sm mb-4">{error.message}</p>

      <div className="bg-white/60 rounded-lg px-3 py-1.5 mb-4">
        <p className="text-xs text-slate-400">
          Reference: <span className="font-mono font-semibold text-slate-500">{error.errorId}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

/** Determine the icon, colors, and default title for a given error. */
function getErrorVisuals(error: AppError): {
  Icon: typeof WifiOff;
  iconColor: string;
  bgColor: string;
  defaultTitle: string;
} {
  if (error.code === 'NETWORK_ERROR' || error.code === 'OFFLINE_ERROR') {
    return {
      Icon: WifiOff,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 border-blue-200',
      defaultTitle: 'Connection Problem',
    };
  }
  if (error.code === 'AUTH_ERROR') {
    return {
      Icon: ShieldAlert,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 border-amber-200',
      defaultTitle: 'Authentication Required',
    };
  }
  if (error.code === 'VALIDATION_ERROR') {
    return {
      Icon: AlertCircle,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50 border-orange-200',
      defaultTitle: 'Please Check Your Input',
    };
  }
  if (error.statusCode && error.statusCode >= 500) {
    return {
      Icon: AlertTriangle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50 border-red-200',
      defaultTitle: 'Server Error',
    };
  }
  if (error.statusCode && error.statusCode === 404) {
    return {
      Icon: AlertCircle,
      iconColor: 'text-slate-400',
      bgColor: 'bg-slate-50 border-slate-200',
      defaultTitle: 'Not Found',
    };
  }
  if (error.statusCode && error.statusCode === 403) {
    return {
      Icon: ShieldAlert,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50 border-red-200',
      defaultTitle: 'Access Denied',
    };
  }
  return {
    Icon: AlertCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50 border-red-200',
    defaultTitle: 'Something Went Wrong',
  };
}

/** Loading spinner shown while retrying. */
export function RetryLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader className="w-6 h-6 text-navy-700 animate-spin" />
    </div>
  );
}
