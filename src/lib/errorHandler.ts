import { supabase } from './supabase';

/**
 * AppError — the custom error class used throughout the application.
 *
 * Extends the native `Error` with structured fields so the UI and logging
 * layers can classify, display, and persist errors consistently.
 */
export class AppError extends Error {
  /** Machine-readable error code, e.g. `NETWORK_ERROR`, `API_404`. */
  public readonly code: string;
  /** HTTP status code when applicable (undefined for non-HTTP errors). */
  public readonly statusCode?: number;
  /** `true` for expected/operational errors, `false` for programmer bugs. */
  public readonly isOperational: boolean;
  /** Arbitrary structured context attached at throw-site. */
  public readonly context: Record<string, unknown>;
  /** Short unique ID for support reference. */
  public readonly errorId: string;

  constructor(params: {
    code: string;
    message: string;
    statusCode?: number;
    isOperational?: boolean;
    context?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.isOperational = params.isOperational ?? true;
    this.context = params.context ?? {};
    this.errorId = generateErrorId();

    // Preserve the original stack / cause when available
    if (params.cause instanceof Error) {
      (this as Error & { cause?: unknown }).cause = params.cause;
    }
  }

  /** Serialize to a plain object for logging / storage. */
  toJSON(): Record<string, unknown> {
    return {
      errorId: this.errorId,
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Generate a short, human-readable error ID (e.g. `ERR-X7K2P9`).
 * Uses crypto.randomUUID when available, falls back to timestamp + random.
 */
export function generateErrorId(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `ERR-${cryptoObj.randomUUID().slice(0, 8).toUpperCase()}`;
  }
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// ── Error Factory Functions ────────────────────────────────────

/**
 * Create a network error — the browser could not reach the server.
 * @param message - User-friendly message (defaults to a generic network message).
 * @param context - Optional structured context.
 */
export function createNetworkError(
  message = 'Unable to connect to the server. Please check your internet connection and try again.',
  context?: Record<string, unknown>,
): AppError {
  return new AppError({
    code: 'NETWORK_ERROR',
    message,
    isOperational: true,
    context,
  });
}

/**
 * Create an API error from an HTTP status code.
 * @param statusCode - HTTP status code (e.g. 404, 500).
 * @param message - User-friendly message.
 * @param context - Optional structured context.
 */
export function createApiError(
  statusCode: number,
  message: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError({
    code: `API_${statusCode}`,
    message,
    statusCode,
    isOperational: true,
    context,
  });
}

/**
 * Create a form validation error for a specific field.
 * @param field - The field name that failed validation.
 * @param message - User-friendly validation message.
 */
export function createValidationError(field: string, message: string): AppError {
  return new AppError({
    code: 'VALIDATION_ERROR',
    message,
    isOperational: true,
    context: { field },
  });
}

/**
 * Create an authentication error.
 * @param message - User-friendly message (defaults to a session-expired message).
 */
export function createAuthError(
  message = 'Your session has expired. Please sign in again.',
): AppError {
  return new AppError({
    code: 'AUTH_ERROR',
    message,
    statusCode: 401,
    isOperational: true,
  });
}

/**
 * Create an offline error — the device has no network connectivity.
 */
export function createOfflineError(): AppError {
  return new AppError({
    code: 'OFFLINE_ERROR',
    message: 'You appear to be offline. Please reconnect and try again.',
    isOperational: true,
  });
}

// ── Error Logger ───────────────────────────────────────────────

type LoggableError = AppError | Error;

interface ErrorLogPayload {
  error_id: string;
  error_type: string;
  error_code: string;
  message: string;
  stack: string | null;
  status_code: number | null;
  is_operational: boolean;
  context: Record<string, unknown>;
  url: string | null;
  user_agent: string | null;
}

/**
 * errorLogger — persists errors to Supabase (`error_logs` table) and
 * logs events to Firebase Analytics when available.
 *
 * Both logging paths are fire-and-forget: a failure in logging never
 * surfaces to the user and never blocks the calling code.
 */
export const errorLogger = {
  /**
   * Log an error to Supabase and Firebase Analytics.
   * @param error - The error to log (AppError or native Error).
   * @param extraContext - Optional additional context merged into the log.
   */
  async log(error: LoggableError, extraContext?: Record<string, unknown>): Promise<void> {
    const appError = error instanceof AppError ? error : toAppError(error);
    const mergedContext = { ...appError.context, ...extraContext };

    const payload: ErrorLogPayload = {
      error_id: appError.errorId,
      error_type: appError.name,
      error_code: appError.code,
      message: appError.message,
      stack: appError.stack ?? null,
      status_code: appError.statusCode ?? null,
      is_operational: appError.isOperational,
      context: mergedContext,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    // Supabase (fire-and-forget, never throws)
    Promise.resolve(supabase.from('error_logs').insert(payload))
      .then(() => {})
      .catch(() => {
        // Logging failure must never surface to the user
      });

    // Firebase Analytics (fire-and-forget)
    try {
      const { logAnalyticsEvent } = await import('./firebaseAnalytics');
      logAnalyticsEvent('app_error', {
        error_id: appError.errorId,
        error_code: appError.code,
        error_type: appError.name,
      });
    } catch {
      // Firebase not available — silently skip
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.error(`[${appError.errorId}] ${appError.name}:`, appError.message, mergedContext);
    }
  },
};

/** Convert a native Error into an AppError (preserves the original as cause). */
function toAppError(error: Error): AppError {
  return new AppError({
    code: 'UNEXPECTED_ERROR',
    message: 'Something went wrong. Please try again.',
    isOperational: false,
    cause: error,
  });
}

// ── Global Unhandled Rejection Listener ────────────────────────

let globalHandlerInstalled = false;

/**
 * Install a global `unhandledrejection` listener that catches promise
 * rejections not handled by any try/catch. Logs them via errorLogger.
 *
 * Safe to call multiple times — only installs once.
 */
export function installGlobalErrorHandler(): void {
  if (globalHandlerInstalled || typeof window === 'undefined') return;
  globalHandlerInstalled = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const error: LoggableError =
      reason instanceof Error ? reason : new Error(String(reason ?? 'Unknown rejection'));
    errorLogger.log(error, { source: 'unhandledrejection' });
  });

  // Also catch synchronous errors that escape React's tree
  window.addEventListener('error', (event) => {
    if (event.error instanceof Error) {
      errorLogger.log(event.error, { source: 'window.onerror' });
    }
  });
}
