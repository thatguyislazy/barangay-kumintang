import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-white/80"
          >
            {label}
            {props.required && <span className="ml-0.5 text-accent-red">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          rows={4}
          className={`w-full resize-none rounded-xl border bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-1 dark:bg-navy-900/40 dark:text-white dark:placeholder:text-white/30 ${
            error
              ? "border-accent-red focus-visible:ring-accent-red"
              : "border-surface-border dark:border-white/15"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-accent-red">{error}</p>}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-ink-500 dark:text-white/50">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
