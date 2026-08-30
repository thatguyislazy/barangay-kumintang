import { Target, Eye } from "lucide-react";
import { barangayConfig } from "../../config/barangay";

export function AboutSection() {
  return (
    <section id="about" className="bg-white py-20 dark:bg-navy-950 lg:py-28">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[1fr,1.1fr] lg:gap-16">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-navy-500">
              About Our Barangay
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-navy-900 dark:text-white lg:text-4xl">
              Serving our community through accessible, efficient, and transparent
              digital services.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-600 dark:text-white/60">
              {barangayConfig.name}, founded in {barangayConfig.foundedYear}, has stood
              as a hub of public service for the people of {barangayConfig.municipality}.
              This platform continues that tradition by bringing our services online —
              making them faster, more transparent, and easier to reach for every
              resident and family we serve.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-surface-border shadow-card dark:border-white/10">
              <img
                src={barangayConfig.heroImage}
                alt="Front entrance of the barangay hall"
                className="h-56 w-full object-cover sm:h-72"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-surface-border bg-surface-off p-6 dark:border-white/10 dark:bg-white/5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white dark:bg-navy-500">
                <Target className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900 dark:text-white">
                Our Mission
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-white/60">
                {barangayConfig.mission}
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-off p-6 dark:border-white/10 dark:bg-white/5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-gold text-navy-900">
                <Eye className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900 dark:text-white">
                Our Vision
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-white/60">
                {barangayConfig.vision}
              </p>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-navy-800 p-6 text-white dark:border-white/10 dark:bg-navy-900 sm:col-span-2">
              <p className="font-display text-base font-semibold">A message to our community</p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Every resident deserves a barangay government that is easy to reach and
                quick to respond. This digital platform is our continuing commitment to
                that promise — built for you, and shaped by your needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
