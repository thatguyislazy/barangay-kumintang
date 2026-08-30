import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 shadow-soft dark:bg-navy-500 dark:hover:bg-navy-400",
  secondary:
    "bg-accent-gold text-navy-900 hover:bg-accent-gold-dark shadow-soft",
  outline:
    "border border-surface-border bg-white text-ink-900 hover:bg-surface-soft dark:bg-transparent dark:text-white dark:border-white/20 dark:hover:bg-white/5",
  ghost: "text-ink-700 hover:bg-surface-soft dark:text-white/80 dark:hover:bg-white/10",
  danger: "bg-accent-red text-white hover:bg-accent-red-dark shadow-soft",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3.5 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-5 py-2.5 rounded-xl gap-2",
  lg: "text-base px-7 py-3.5 rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", isLoading, fullWidth, className = "", children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
