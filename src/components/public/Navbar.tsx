import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { barangayConfig } from "../../config/barangay";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  function handleNavClick(e: React.MouseEvent, href: string) {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate("/" + href);
      return;
    }
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  }

  function handleLogoClick(e: React.MouseEvent) {
    if (location.pathname === "/") {
    e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
   }
  }

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors ${
        scrolled
          ? "border-surface-border bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-navy-950/90"
          : "border-transparent bg-white/70 backdrop-blur-md dark:bg-navy-950/70"
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between lg:h-20">
        <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2.5">
          <img
            src={barangayConfig.logo}
            alt={`${barangayConfig.name} official seal`}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-navy-100 lg:h-11 lg:w-11"
          />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-navy-800 dark:text-white lg:text-base">
              {barangayConfig.shortName}
            </p>
            <p className="text-[11px] font-medium text-ink-500 dark:text-white/50">
              {barangayConfig.municipality}
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm font-semibold text-ink-700 transition-colors hover:text-navy-700 dark:text-white/70 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-800 bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-navy-700 dark:border-navy-400 dark:bg-navy-500 dark:hover:bg-navy-400"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin Login
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-700 dark:border-white/15 dark:text-white"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="border-t border-surface-border bg-white px-5 py-4 dark:border-white/10 dark:bg-navy-950 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-surface-soft dark:text-white/80 dark:hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/admin/login"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white dark:bg-navy-500"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Admin Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
