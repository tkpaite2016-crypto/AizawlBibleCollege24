import { AppError, createApiError, createNetworkError, createValidationError, createAuthError } from './errorHandler';

/**
 * The result of a `safeSupabaseCall` — a discriminated union so callers
 * can narrow on `error === null` to access `data` without a null check.
 */
export type SafeResult<T> =
  | { data: T; error: null }
  | { data: null; error: AppError };

/**
 * Map a Supabase error code/string to a user-friendly `AppError`.
 *
 * Handles the most common Postgres and PostgREST error codes:
 * - `PGRST116` — no rows returned from `.single()` (treated as 404)
 * - `23505`   — unique constraint violation (duplicate)
 * - `23503`   — foreign key violation
 * - `42501`   — RLS policy violation (insufficient privileges)
 * - `23502`   — not-null violation
 * - Auth error prefixes (`auth/`, `Invalid login credentials`)
 */
function mapSupabaseError(supabaseError: { code?: string; message: string; details?: string }): AppError {
  const code = supabaseError.code ?? '';
  const message = supabaseError.message ?? '';

  // PostgREST: no rows found (from .single())
  if (code === 'PGRST116' || message.includes('JSON object requested')) {
    return createApiError(404, 'The requested item could not be found.');
  }

  // PostgREST: multiple rows (from .single())
  if (code === 'PGRST115') {
    return createApiError(500, 'Received multiple results where only one was expected.');
  }

  // Unique constraint violation
  if (code === '23505') {
    const detail = supabaseError.details ?? '';
    return createValidationError('_form', 'This item already exists. ' + (detail ? detail.replace(/Key \(.*?\)=\((.*?)\) already exists\./, 'Value "$1" is already in use.') : ''));
  }

  // Foreign key violation
  if (code === '23503') {
    return createValidationError('_form', 'This action references an item that no longer exists.');
  }

  // Not-null violation
  if (code === '23502') {
    return createValidationError('_form', 'A required field is missing.');
  }

  // RLS policy violation
  if (code === '42501' || message.includes('policy') || message.includes('permission')) {
    return createApiError(403, 'You do not have permission to perform this action.');
  }

  // Auth errors
  if (message.includes('Invalid login credentials')) {
    return createAuthError('Invalid email or password. Please try again.');
  }
  if (message.includes('Email not confirmed')) {
    return createAuthError('Please confirm your email address before signing in.');
  }
  if (message.startsWith('auth/')) {
    return createAuthError(message.replace(/^auth\//, ''));
  }

  // Rate limiting
  if (code === '429' || message.includes('rate limit')) {
    return createApiError(429, 'Too many requests. Please wait a moment and try again.');
  }

  // Generic fallback
  return createApiError(500, 'Something went wrong on our end. Please try again.');
}

/**
 * Wrap any Supabase client call in a typed, error-safe wrapper.
 *
 * Returns a discriminated union so the caller can check `error` without
 * dealing with Supabase's loosely-typed `{ error }` object:
 *
 * ```ts
 * const { data, error } = await safeSupabaseCall(
 *   supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
 * );
 * if (error) return <ErrorMessage error={error} />;
 * return <ProfileView profile={data} />;
 * ```
 *
 * @param queryPromise - The Supabase query promise (e.g. `supabase.from('x').select()`).
 * @param context - Optional structured context for error logging.
 */
export async function safeSupabaseCall<T>(
  queryPromise: PromiseLike<{ data: T | null; error: { code?: string; message: string; details?: string } | null }>,
  context?: Record<string, unknown>,
): Promise<SafeResult<T>> {
  try {
    const result = await queryPromise;

    if (result.error) {
      const appError = mapSupabaseError(result.error);
      // Attach context for logging
      (appError as AppError & { context: Record<string, unknown> }).context = {
        ...appError.context,
        ...context,
        supabaseErrorCode: result.error.code,
        supabaseMessage: result.error.message,
      };
      return { data: null, error: appError };
    }

    // For .maybeSingle(), data can be null without an error — that's a valid "not found"
    return { data: result.data as T, error: null };
  } catch (err) {
    // Network failure or other unexpected error
    const appError =
      err instanceof Error && err.message.includes('Failed to fetch')
        ? createNetworkError()
        : createApiError(500, 'Something went wrong. Please try again.');
    (appError as AppError & { context: Record<string, unknown> }).context = {
      ...appError.context,
      ...context,
      originalError: err instanceof Error ? err.message : String(err),
    };
    return { data: null, error: appError };
  }
}
