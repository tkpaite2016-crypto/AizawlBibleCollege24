import { useRouteError, Link, isRouteErrorResponse } from 'react-router-dom';
import { Home, AlertTriangle, ShieldAlert, Search, Loader } from 'lucide-react';
import { AppError } from '../lib/errorHandler';
import { errorLogger } from '../lib/errorHandler';

/**
 * RouterErrorBoundary — the error element for React Router routes.
 *
 * Uses `useRouteError` to read the error thrown by a route loader/action or
 * by the router itself (404, 403, etc.), logs it, and renders a distinct UI
 * for each error type.
 *
 * Usage in the router configuration:
 * ```tsx
 * <Route errorElement={<RouterErrorBoundary />}>
 *   <Route path="/" element={<Home />} />
 * </Route>
 * ```
 */
export default function RouterErrorBoundary() {
  const error = useRouteError();

  let status: number = 500;
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let Icon = AlertTriangle;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = 'Page not found';
      message = "The page you're looking for doesn't exist or may have been moved.";
      Icon = Search;
    } else if (status === 403) {
      title = 'Access denied';
      message = "You don't have permission to view this page.";
      Icon = ShieldAlert;
    } else if (status === 401) {
      title = 'Sign in required';
      message = 'Please sign in to access this page.';
      Icon = ShieldAlert;
    } else if (status >= 500) {
      title = 'Server error';
      message = 'Something went wrong on our end. Please try again in a moment.';
      Icon = AlertTriangle;
    }
  } else if (error instanceof AppError) {
    title = 'Something went wrong';
    message = error.message;
    status = error.statusCode ?? 500;
  } else if (error instanceof Error) {
    title = 'Something went wrong';
    message = 'An unexpected error occurred.';
  }

  // Log the error (fire-and-forget)
  const errorId =
    error instanceof AppError
      ? error.errorId
      : typeof error === 'object' && error !== null && 'errorId' in error
        ? (error as { errorId: string }).errorId
        : 'ERR-UNKNOWN';

  errorLogger.log(
    error instanceof Error ? error : new Error(String(error ?? 'Router error')),
    { source: 'RouterErrorBoundary', status, errorId },
  );

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>

        <p className="text-sm font-mono font-semibold text-slate-400 mb-1">Error {status}</p>
        <h1 className="text-xl font-serif font-bold text-navy-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-sm mb-6">{message}</p>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-slate-400">
            Reference: <span className="font-mono font-semibold text-slate-600">{errorId}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary inline-flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <Loader className="w-4 h-4" /> Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
