export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  role: "Administrator" | "Health Officer" | "Staff";
  avatarInitials: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
