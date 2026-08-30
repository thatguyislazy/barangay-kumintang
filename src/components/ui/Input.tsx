import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, trailing, id, className = "", ...props }, ref) => {
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
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-1 dark:bg-navy-900/40 dark:text-white dark:placeholder:text-white/30 ${
              icon ? "pl-10" : ""
            } ${trailing ? "pr-10" : ""} ${
              error
                ? "border-accent-red focus-visible:ring-accent-red"
                : "border-surface-border dark:border-white/15"
            } ${className}`}
            {...props}
          />
          {trailing && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-accent-red">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-500 dark:text-white/50">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
