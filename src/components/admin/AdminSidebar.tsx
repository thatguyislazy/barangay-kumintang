import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Pill,
  BarChart3,
  LogOut,
  X,
} from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { barangayConfig } from "../../config/barangay";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/admin/patients", label: "Patient Records", icon: Users },
  { to: "/admin/medicines", label: "Medicine Inventory", icon: Pill },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { user, logout } = useAuth();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img
            src={barangayConfig.logo}
            alt="Barangay seal"
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-white">
              {barangayConfig.shortName}
            </p>
            <p className="text-[11px] font-medium text-white/50">Admin Panel</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-600 text-xs font-bold text-white">
              {user?.avatarInitials}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">{user?.fullName}</p>
              <p className="text-[11px] text-white/40">{user?.role}</p>
            </div>
          </div>
          <ThemeToggle className="border-white/15 bg-white/5 text-white hover:bg-white/10" />
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-navy-900 lg:block">{content}</aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-navy-950/60"
            onClick={onClose}
          />
          <aside className="relative h-full w-72 bg-navy-900 shadow-lift">{content}</aside>
        </div>
      )}
    </>
  );
}
