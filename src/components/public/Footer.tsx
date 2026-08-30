import { Link } from "react-router-dom";
import { barangayConfig } from "../../config/barangay";

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-off dark:border-white/10 dark:bg-navy-950">
      <div className="container-page flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={barangayConfig.logo}
            alt={`${barangayConfig.name} official seal`}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div>
            <p className="font-display text-sm font-bold text-navy-900 dark:text-white">
              {barangayConfig.name}
            </p>
            <p className="text-xs text-ink-500 dark:text-white/50">
              {barangayConfig.municipality}, {barangayConfig.province}
            </p>
          </div>
        </div>

        <p className="text-xs text-ink-500 dark:text-white/40">
          © {new Date().getFullYear()} {barangayConfig.name}. All rights reserved.
        </p>

        <Link
          to="/admin/login"
          className="text-xs font-semibold text-ink-500 hover:text-navy-700 dark:text-white/40 dark:hover:text-white"
        >
          Admin Access
        </Link>
      </div>
    </footer>
  );
}
