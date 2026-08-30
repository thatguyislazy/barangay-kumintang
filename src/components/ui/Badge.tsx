import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-soft text-ink-700 dark:bg-white/10 dark:text-white/70",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-50 text-accent-red dark:bg-red-500/15 dark:text-red-300",
  info: "bg-navy-50 text-navy-700 dark:bg-navy-500/20 dark:text-navy-200",
  gold: "bg-amber-50 text-accent-gold-dark dark:bg-amber-500/15 dark:text-accent-gold",
};

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const statusToneMap: Record<string, Tone> = {
  Pending: "warning",
  Confirmed: "info",
  Completed: "success",
  Cancelled: "danger",
  "In Stock": "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
  "Expiring Soon": "gold",
  Active: "success",
  Archived: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusToneMap[status] ?? "neutral"}>{status}</Badge>;
}
