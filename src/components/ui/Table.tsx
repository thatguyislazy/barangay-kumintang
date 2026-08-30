import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="scrollbar-thin overflow-x-auto rounded-xl border border-surface-border dark:border-white/10">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-off text-xs font-semibold uppercase tracking-wide text-ink-500 dark:bg-white/5 dark:text-white/50">
      <tr>{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-surface-border dark:divide-white/10">{children}</tbody>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3.5 align-middle text-ink-700 dark:text-white/80 ${className}`}>
      {children}
    </td>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-ink-400">{icon}</div>}
      <div>
        <p className="font-display font-semibold text-ink-900 dark:text-white">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-white/50">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
