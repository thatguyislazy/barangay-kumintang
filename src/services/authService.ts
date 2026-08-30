import type { AdminUser, LoginCredentials } from "../types/auth";

// NOTE: Demo-only credentials for the frontend prototype.
// Replace this module with a real API / Supabase / Firebase call later —
// the AuthContext consuming this service does not need to change.
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin123";

const DEMO_USER: AdminUser = {
  id: "admin-001",
  username: "admin",
  fullName: "Barangay Administrator",
  role: "Administrator",
  avatarInitials: "BA",
};

const STORAGE_KEY = "barangay_admin_session";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AdminUser> {
    await delay(700);

    if (
      credentials.username.trim().toLowerCase() === DEMO_USERNAME &&
      credentials.password === DEMO_PASSWORD
    ) {
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
      return DEMO_USER;
    }

    throw new Error("Invalid username or password.");
  },

  async logout(): Promise<void> {
    await delay(200);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  },

  getStoredUser(): AdminUser | null {
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    const raw = fromLocal ?? fromSession;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  },
};
