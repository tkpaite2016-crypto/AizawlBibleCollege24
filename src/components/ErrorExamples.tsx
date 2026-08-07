import { useState } from 'react';
import { z } from 'zod';
import { Loader, Save, User } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { useApiRequest } from '../hooks/useApiRequest';
import { useFormValidation } from '../hooks/useFormValidation';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useToast } from './Toast';
import ErrorMessage from './ErrorMessage';
import ValidationErrorList, { InlineError } from './ValidationErrorList';
import { safeSupabaseCall } from '../lib/supabaseErrorHandler';
import { supabase, type Profile } from '../lib/supabase';
import type { AppError } from '../lib/errorHandler';

// ── Example 1: Wrapping a page with ErrorBoundary ─────────────────────────

/**
 * Example 1 — Wrapping a page component with `ErrorBoundary`.
 * Any render error in `ProfilePage` is caught and shows the fallback UI.
 */
export function Example1_ErrorBoundary() {
  return (
    <ErrorBoundary>
      <ProfilePage />
    </ErrorBoundary>
  );
}

function ProfilePage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-serif font-bold text-navy-900">Profile</h2>
      <p className="text-slate-500 text-sm mt-2">This page is wrapped in an ErrorBoundary.</p>
    </div>
  );
}

// ── Example 2: useApiRequest with Supabase + error display ─────────────────

/**
 * Example 2 — Using `useApiRequest` to fetch data from Supabase with
 * automatic retry, cancellation, and error display.
 */
export function Example2_ApiRequest() {
  const { data, error, isLoading, retry } = useApiRequest<Profile[]>(async (signal) => {
    const result = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .abortSignal(signal);
    if (result.error) throw result.error;
    return result.data ?? [];
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader className="w-6 h-6 text-navy-700 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={retry} />;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-serif font-bold text-navy-900">Recent Users</h2>
      {data?.map((profile) => (
        <div key={profile.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
          <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center">
            <User className="w-4 h-4 text-navy-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-navy-900">{profile.full_name ?? 'Unnamed'}</p>
            <p className="text-xs text-slate-500">{profile.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Example 3: Form with Zod validation + inline errors ────────────────────

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactForm = z.infer<typeof contactSchema>;

/**
 * Example 3 — A form using `useFormValidation` with a Zod schema,
 * showing inline validation errors per field.
 */
export function Example3_FormValidation() {
  const { errors, validate, validateField, clearError, isValid } = useFormValidation<ContactForm>(contactSchema);
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate(form)) {
      toast.success('Message sent!', 'We will get back to you soon.');
      setSubmitted(true);
    } else {
      toast.error('Please fix the errors', 'Some fields need your attention.');
    }
  };

  if (submitted) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
        <p className="text-green-700 font-medium">Thank you! Your message has been sent.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="label">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => {
            setForm({ ...form, name: e.target.value });
            if (errors.name) clearError('name');
          }}
          onBlur={(e) => validateField('name', e.target.value)}
          className="input-field"
          placeholder="Your name"
        />
        <InlineError message={errors.name?.[0]} />
      </div>

      <div>
        <label className="label">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => {
            setForm({ ...form, email: e.target.value });
            if (errors.email) clearError('email');
          }}
          onBlur={(e) => validateField('email', e.target.value)}
          className="input-field"
          placeholder="you@example.com"
        />
        <InlineError message={errors.email?.[0]} />
      </div>

      <div>
        <label className="label">Message</label>
        <textarea
          value={form.message}
          onChange={(e) => {
            setForm({ ...form, message: e.target.value });
            if (errors.message) clearError('message');
          }}
          onBlur={(e) => validateField('message', e.target.value)}
          className="input-field resize-none min-h-24"
          placeholder="Your message..."
        />
        <InlineError message={errors.message?.[0]} />
      </div>

      {Object.keys(errors).length > 0 && (
        <ValidationErrorList errors={errors} onDismiss={(field) => clearError(field as keyof ContactForm)} />
      )}

      <button type="submit" disabled={!isValid} className="btn-primary inline-flex items-center gap-2">
        <Save className="w-4 h-4" /> Send Message
      </button>
    </form>
  );
}

// ── Example 4: OfflineBanner with useNetworkStatus ─────────────────────────

/**
 * Example 4 — The `OfflineBanner` rendering conditionally based on
 * `useNetworkStatus`. The banner auto-shows when offline.
 */
export function Example4_OfflineBanner() {
  const { isOnline, wasOffline, connectionType } = useNetworkStatus();

  return (
    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
      <h2 className="text-lg font-serif font-bold text-navy-900 mb-3">Network Status</h2>
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium text-navy-900">{isOnline ? 'Online' : 'Offline'}</span>
        </p>
        {wasOffline && (
          <p className="text-amber-600 text-xs">You were recently offline — data may have been queued.</p>
        )}
        <p className="text-slate-500 text-xs">Connection type: {connectionType}</p>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        The OfflineBanner component at the top of the page shows automatically when offline.
      </p>
    </div>
  );
}

// ── Example 5: safeSupabaseCall in a data-fetching function ────────────────

/**
 * Example 5 — Using `safeSupabaseCall` in a data-fetching function.
 * The discriminated union return type means `data` is only accessible
 * when `error` is `null`.
 */
export async function fetchUserProfile(userId: string) {
  const result = await safeSupabaseCall<Profile>(
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle() as PromiseLike<{ data: Profile | null; error: { code?: string; message: string; details?: string } | null }>,
    { userId, operation: 'fetchUserProfile' },
  );

  if (result.error) {
    // `result.data` is null here, `result.error` is an AppError
    return { profile: null, error: result.error };
  }

  // `result.data` is typed as Profile, `result.error` is null
  return { profile: result.data, error: null };
}

/**
 * Example5_Component — demonstrates calling `fetchUserProfile` and
 * rendering the result or error.
 */
export function Example5_SafeSupabaseCall() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    const { profile: p, error: e } = await fetchUserProfile('00000000-0000-0000-0000-000000000000');
    setProfile(p);
    setError(e);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 text-navy-700 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={loadProfile} />;
  }

  if (profile) {
    return (
      <div className="p-4 bg-white rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-navy-900">{profile.full_name}</p>
        <p className="text-xs text-slate-500">{profile.email}</p>
      </div>
    );
  }

  return (
    <button onClick={loadProfile} className="btn-secondary">
      Load Profile (demo)
    </button>
  );
}
