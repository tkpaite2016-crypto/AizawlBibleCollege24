import { useState, useEffect, useCallback, useRef } from 'react';
import { AppError, createNetworkError, createApiError, createOfflineError } from '../lib/errorHandler';

interface UseApiRequestResult<T> {
  data: T | null;
  error: AppError | null;
  isLoading: boolean;
  retry: () => void;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * useApiRequest — wraps an async data-fetching function with automatic retry,
 * cancellation, and error classification.
 *
 * The fetcher receives an `AbortSignal` so in-flight requests can be cancelled
 * on component unmount. Retries use exponential backoff (3 attempts).
 *
 * @param fetcher - Async function that receives an `AbortSignal` and returns data.
 * @param deps - Dependency array — refetches when these change (like useEffect deps).
 *
 * @returns `{ data, error, isLoading, retry }`
 *
 * Usage:
 * ```tsx
 * const { data, error, isLoading, retry } = useApiRequest(
 *   async (signal) => {
 *     const { data } = await supabase.from('profiles').select('*').abortSignal(signal);
 *     return data;
 *   },
 *   [userId],
 * );
 * ```
 */
export function useApiRequest<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): UseApiRequestResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(createOfflineError());
      setIsLoading(false);
      return;
    }

    let lastError: AppError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (controller.signal.aborted) return;

      try {
        const result = await fetcher(controller.signal);
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
        setIsLoading(false);
        return;
      } catch (err) {
        if (controller.signal.aborted) return;

        // Classify the error
        if (err instanceof AppError) {
          lastError = err;
        } else if (err instanceof Error) {
          if (err.name === 'AbortError') return;
          if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            lastError = createNetworkError();
          } else {
            lastError = createApiError(500, 'Something went wrong. Please try again.');
          }
        } else {
          lastError = createApiError(500, 'Something went wrong. Please try again.');
        }

        // Don't retry on non-retryable errors
        if (
          lastError.statusCode &&
          lastError.statusCode >= 400 &&
          lastError.statusCode < 500 &&
          lastError.statusCode !== 408 &&
          lastError.statusCode !== 429
        ) {
          break;
        }

        // Exponential backoff before next attempt
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!controller.signal.aborted && lastError) {
      setError(lastError);
      setIsLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    execute();
    return () => {
      abortRef.current?.abort();
    };
  }, [execute, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { data, error, isLoading, retry };
}
