import { Menu } from "lucide-react";

interface AdminHeaderProps {
  title: string;
  description?: string;
  onMenuClick: () => void;
}

export function AdminHeader({ title, description, onMenuClick }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-surface-border bg-white/90 px-5 py-4 backdrop-blur-md dark:border-white/10 dark:bg-navy-950/90 lg:px-8">
      <button
        onClick={onMenuClick}
        aria-label="Open sidebar"
        className="rounded-lg border border-surface-border p-2 text-ink-700 dark:border-white/15 dark:text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div>
        <h1 className="font-display text-lg font-bold text-navy-900 dark:text-white sm:text-xl">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-ink-500 dark:text-white/50 sm:text-sm">{description}</p>
        )}
      </div>
    </header>
  );
}
