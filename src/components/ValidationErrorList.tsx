import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ValidationErrorListProps {
  /** Map of field name → array of error messages. */
  errors: Record<string, string[]>;
  /** Optional callback to dismiss a specific field's errors. */
  onDismiss?: (field: string) => void;
}

/**
 * ValidationErrorList — displays field-level validation errors grouped by field,
 * with optional dismissal of individual fields.
 *
 * Usage:
 * ```tsx
 * <ValidationErrorList errors={errors} onDismiss={clearError} />
 * ```
 */
export default function ValidationErrorList({ errors, onDismiss }: ValidationErrorListProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleFields = Object.entries(errors).filter(([field]) => !dismissed.has(field));

  if (visibleFields.length === 0) return null;

  const handleDismiss = (field: string): void => {
    setDismissed((prev) => new Set(prev).add(field));
    onDismiss?.(field);
  };

  return (
    <div className="space-y-2 animate-fade-in">
      {visibleFields.map(([field, messages]) => (
        <div
          key={field}
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700 capitalize mb-0.5">
              {field.replace(/_/g, ' ').replace(/_form$/, 'form')}
            </p>
            <ul className="space-y-0.5">
              {messages.map((msg, i) => (
                <li key={i} className="text-sm text-red-600">{msg}</li>
              ))}
            </ul>
          </div>
          {onDismiss && (
            <button
              onClick={() => handleDismiss(field)}
              className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * InlineError — a single error message for one field, rendered below an input.
 * Use this for per-field inline display instead of the grouped list.
 */
export function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1 animate-fade-in">
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  );
}
