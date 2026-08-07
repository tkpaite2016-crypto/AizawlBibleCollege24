import { useState, useCallback, useMemo } from 'react';
import { z, type ZodSchema, type ZodError } from 'zod';

interface FieldErrors {
  [fieldName: string]: string[];
}

interface UseFormValidationResult<T> {
  errors: FieldErrors;
  validate: (data: unknown) => boolean;
  validateField: (field: keyof T, value: unknown) => boolean;
  clearError: (field: keyof T) => void;
  clearAllErrors: () => void;
  isValid: boolean;
  /** Flat list of all error messages across all fields. */
  errorMessages: string[];
}

/**
 * useFormValidation — validates form data against a Zod schema.
 *
 * Returns `{ errors, validate, validateField, clearError, clearAllErrors, isValid, errorMessages }`.
 * `errors` is a map of field name → array of user-friendly messages, suitable for
 * rendering inline below each input.
 *
 * @param schema - A Zod schema to validate against.
 *
 * Usage:
 * ```tsx
 * const schema = z.object({
 *   email: z.string().email('Please enter a valid email'),
 *   password: z.string().min(8, 'Password must be at least 8 characters'),
 * });
 * const { errors, validate, validateField } = useFormValidation(schema);
 * ```
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
): UseFormValidationResult<T> {
  const [errors, setErrors] = useState<FieldErrors>({});

  const formatZodError = useCallback((zodError: ZodError): FieldErrors => {
    const fieldErrors: FieldErrors = {};
    for (const issue of zodError.issues) {
      const field = issue.path[0] as string;
      if (!field) continue;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      // Use the user-friendly message from Zod, or fall back to a generic message
      const message = issue.message || `${field} is invalid`;
      if (!fieldErrors[field].includes(message)) {
        fieldErrors[field].push(message);
      }
    }
    return fieldErrors;
  }, []);

  const validate = useCallback(
    (data: unknown): boolean => {
      const result = schema.safeParse(data);
      if (result.success) {
        setErrors({});
        return true;
      }
      setErrors(formatZodError(result.error));
      return false;
    },
    [schema, formatZodError],
  );

  const validateField = useCallback(
    (field: keyof T, value: unknown): boolean => {
      // Validate just the one field by constructing a partial object
      try {
        const partial = { [field]: value } as Record<string, unknown>;
        // Use the schema's shape to validate a single field
        const shape = (schema as unknown as { _def: { shape?: Record<string, z.ZodType> } })._def?.shape;
        if (shape && shape[field as string]) {
          const fieldSchema = shape[field as string];
          const result = fieldSchema.safeParse(value);
          if (result.success) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next[field as string];
              return next;
            });
            return true;
          }
          setErrors((prev) => ({
            ...prev,
            [field]: result.error.issues.map((i: z.ZodIssue) => i.message || `${String(field)} is invalid`),
          }));
          return false;
        }
        // Fallback: validate the whole object and filter to this field
        const result = schema.safeParse(partial);
        if (result.success) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field as string];
            return next;
          });
          return true;
        }
        const fieldErrors = formatZodError(result.error);
        setErrors((prev) => ({
          ...prev,
          [field]: fieldErrors[field as string] ?? [],
        }));
        return false;
      } catch {
        return false;
      }
    },
    [schema, formatZodError],
  );

  const clearError = useCallback((field: keyof T): void => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback((): void => {
    setErrors({});
  }, []);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const errorMessages = useMemo(() => {
    return Object.values(errors).flat();
  }, [errors]);

  return {
    errors,
    validate,
    validateField,
    clearError,
    clearAllErrors,
    isValid,
    errorMessages,
  };
}
