import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-surface-border bg-white shadow-card dark:border-white/10 dark:bg-navy-800/60 ${
        padded ? "p-6" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
