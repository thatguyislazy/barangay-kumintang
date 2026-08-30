import { useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { barangayConfig } from "../../config/barangay";

export default function AdminLogin() {
  const { login, isAuthenticated, error, clearError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await login({ username, password, rememberMe });
    } catch {
      // error surfaced via context
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-off px-4 py-12 dark:bg-navy-950">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-navy-700 dark:text-white/50 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to website
        </Link>

        <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-lift dark:border-white/10 dark:bg-navy-900">
          <div className="flex flex-col items-center text-center">
            <img
              src={barangayConfig.logo}
              alt={`${barangayConfig.name} official seal`}
              className="h-16 w-16 rounded-full object-cover shadow-soft"
            />
            <div className="mt-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white dark:bg-navy-500">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-navy-900 dark:text-white">
              Admin Login
            </h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-white/50">
              {barangayConfig.name} Administrative Access
            </p>
          </div>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-accent-red dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-ink-400 hover:text-ink-600 dark:hover:text-white/80"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-white/60">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-navy-700 focus-visible:ring-2 focus-visible:ring-navy-500 dark:border-white/20"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-sm font-semibold text-navy-700 hover:underline dark:text-navy-300"
                onClick={() => alert("Please contact your barangay system administrator to reset your password.")}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-400 dark:text-white/30">
            Demo credentials — Username: admin · Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
}
