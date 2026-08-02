import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Loader, AlertCircle } from 'lucide-react';
import { AppError, errorLogger, generateErrorId } from '../lib/errorHandler';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Receives the error and a reset handler. */
  fallback?: (error: AppError, resetErrorBoundary: () => void) => ReactNode;
  /** Called when an error is caught, after logging. */
  onError?: (error: AppError, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: AppError | null;
}

/**
 * ErrorBoundary — a React class component that catches JavaScript errors
 * anywhere in the child component tree, logs them to Supabase + Firebase Analytics,
 * and displays a user-friendly fallback UI.
 *
 * Supports a custom `fallback` render prop, or uses the default fallback which
 * includes a "Try Again" button and a "Report This Problem" link.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyPage />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError =
      error instanceof AppError
        ? error
        : new AppError({
            code: 'RENDER_ERROR',
            message: 'Something went wrong while displaying this page.',
            isOperational: false,
            cause: error,
            context: { componentStack: 'See errorInfo' },
          });
    return { error: appError };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const appError = this.state.error ?? new AppError({
      code: 'RENDER_ERROR',
      message: error.message,
      isOperational: false,
      cause: error,
    });

    // Attach component stack to context
    (appError as AppError & { context: Record<string, unknown> }).context = {
      ...appError.context,
      componentStack: info.componentStack,
    };

    // Log to Supabase + Firebase Analytics (fire-and-forget)
    errorLogger.log(appError, { source: 'ErrorBoundary' });

    this.props.onError?.(appError, info);
  }

  resetErrorBoundary = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary);
      }
      return <DefaultFallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
    }
    return this.props.children;
  }
}

/**
 * DefaultFallback — the standard error UI shown when no custom fallback is provided.
 */
function DefaultFallback({ error, resetErrorBoundary }: { error: AppError; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-serif font-bold text-navy-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-sm mb-4">{error.message}</p>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-slate-400">
            Error reference: <span className="font-mono font-semibold text-slate-600">{error.errorId}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            If the problem persists, please share this reference with support.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <a
            href={`mailto:aizawlbiblecollege24@gmail.com?subject=Error Report ${error.errorId}&body=Error ID: ${error.errorId}%0D%0A%0D%0APlease describe what you were doing when this error occurred:%0D%0A`}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-4 h-4" /> Report This Problem
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience wrapper for async route loaders that may reject.
 * Usage in route definitions: `loader: asyncLoaderWrapper(myLoader)`
 */
export function asyncLoaderWrapper<T extends (...args: never[]) => Promise<unknown>>(
  loader: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await loader(...args);
    } catch (err) {
      const errorId = generateErrorId();
      const appError =
        err instanceof AppError
          ? err
          : new AppError({
              code: 'ROUTE_LOADER_ERROR',
              message: 'Failed to load this page.',
              isOperational: false,
              cause: err instanceof Error ? err : new Error(String(err)),
            });
      errorLogger.log(appError, { source: 'asyncLoaderWrapper', errorId });
      throw appError;
    }
  }) as T;
}

/** Loading indicator shown while the boundary is resetting. */
export function ErrorBoundaryResetLoader() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader className="w-6 h-6 text-navy-700 animate-spin" />
    </div>
  );
}
