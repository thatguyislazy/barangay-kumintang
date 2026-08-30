import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-white text-ink-700 transition-colors hover:bg-surface-soft dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 ${className}`}
    >
      {theme === "light" ? (
        <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
