# Barangay Kumintang Ilaya — Digital Governance Platform

A React + TypeScript + Vite + Tailwind CSS platform with a public barangay
website and a protected admin dashboard, built light-theme-first with an
optional dark mode.

## Getting started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Admin demo credentials

- **Username:** `admin`
- **Password:** `admin123`

Login is at `/admin/login`, reachable from the "Admin Login" button in the
top navbar.

## Structure

- `src/config/barangay.ts` — all barangay-specific info (name, address,
  contact, logo, hero image) in one place.
- `src/services/*` — mock/local data layers for auth, appointments,
  patients, medicines, and reports. Swap the internals of each function for
  a real API / Supabase / Firebase call later — the pages that consume them
  don't need to change.
- `src/context/ThemeContext.tsx` — light/dark theme, persisted to
  localStorage.
- `src/context/AuthContext.tsx` — admin auth session state.
- `src/routes/AppRoutes.tsx` — all public and admin routes.
- `src/routes/ProtectedRoute.tsx` — guards `/admin/*` routes.

## Public routes

- `/` — Home (Hero, About, Services, Contact)
- `/medical-appointment` — the only public service: booking a barangay
  medical appointment

## Admin routes (protected)

- `/admin/login`
- `/admin/dashboard`
- `/admin/appointments`
- `/admin/patients`
- `/admin/medicines`
- `/admin/reports`

## Notes

- The hero background and barangay seal come from the images you provided
  (`src/assets/images/hero-barangay-hall.png`,
  `src/assets/logo/barangay-seal.png`).
- Replace the placeholder phone/email in `src/config/barangay.ts` with the
  barangay's real contact details before deploying.
