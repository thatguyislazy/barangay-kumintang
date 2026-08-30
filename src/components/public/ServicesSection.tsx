import { Link } from "react-router-dom";
import { HeartPulse, ArrowUpRight, CalendarCheck, Clock, ShieldCheck } from "lucide-react";

const features = [
  { icon: CalendarCheck, text: "Pick a date and time that works for you" },
  { icon: Clock, text: "Get reviewed by the barangay health administrator" },
  { icon: ShieldCheck, text: "Your information stays secure and private" },
];

export function ServicesSection() {
  return (
    <section id="services" className="bg-surface-off py-20 dark:bg-navy-900/40 lg:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-navy-500">
            Barangay Services
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-navy-900 dark:text-white lg:text-4xl">
            One service, made effortless
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-600 dark:text-white/60">
            We're starting with what matters most to your family's wellbeing — easy
            access to barangay health services.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="group relative overflow-hidden rounded-2xl border border-surface-border bg-white p-8 shadow-card transition-shadow hover:shadow-lift dark:border-white/10 dark:bg-navy-800/60 sm:p-10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-navy-50 blur-2xl dark:bg-navy-500/10" />
            <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start">
              <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-white shadow-lift dark:bg-navy-500">
                <HeartPulse className="h-8 w-8" aria-hidden="true" />
              </div>

              <div className="flex-1">
                <h3 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
                  Medical Appointment
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-white/60">
                  Schedule a medical appointment conveniently through the barangay's
                  digital platform.
                </p>

                <ul className="mt-6 grid gap-3 sm:grid-cols-1">
                  {features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3 text-sm text-ink-700 dark:text-white/70">
                      <feature.icon className="h-4 w-4 shrink-0 text-navy-600 dark:text-navy-300" aria-hidden="true" />
                      {feature.text}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/medical-appointment"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-navy-800 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 hover:bg-navy-700 dark:bg-navy-500 dark:hover:bg-navy-400"
                >
                  Book Appointment
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
