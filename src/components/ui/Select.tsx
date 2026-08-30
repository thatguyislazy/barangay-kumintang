import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = "", children, ...props }, ref) => {
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
          <select
            ref={ref}
            id={inputId}
            className={`w-full appearance-none rounded-xl border bg-white px-4 py-2.5 pr-10 text-sm text-ink-900 transition-colors focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-1 dark:bg-navy-900/40 dark:text-white ${
              error
                ? "border-accent-red focus-visible:ring-accent-red"
                : "border-surface-border dark:border-white/15"
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </div>
        {error && <p className="mt-1.5 text-xs font-medium text-accent-red">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
