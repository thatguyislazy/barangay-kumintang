import { ArrowRight, Sparkles } from "lucide-react";
import { barangayConfig } from "../../config/barangay";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={barangayConfig.heroImage}
          alt="Barangay Hall of Kumintang Ilaya"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/40 dark:from-navy-950 dark:via-navy-950/85 dark:to-navy-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-navy-950" />
      </div>

      <div className="container-page relative flex min-h-[640px] items-center py-24 lg:min-h-[720px]">
        <div className="max-w-2xl">
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] text-navy-900 dark:text-white sm:text-5xl lg:text-6xl">
            Empowering Barangays Through
            <span className="text-navy-600 dark:text-navy-300"> Digital Governance</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-700 dark:text-white/70 lg:text-lg">
            {barangayConfig.description}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#services"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 px-6 py-3.5 text-sm font-semibold text-white shadow-lift transition-transform hover:-translate-y-0.5 hover:bg-navy-700 dark:bg-navy-500 dark:hover:bg-navy-400"
            >
              Explore Services
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#about"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-6 py-3.5 text-sm font-semibold text-navy-800 shadow-soft transition-colors hover:bg-surface-soft dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Learn More
            </a>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-navy-100 pt-6 dark:border-white/10">
            {barangayConfig.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs font-medium text-ink-500 dark:text-white/50">
                  {stat.label}
                </dt>
                <dd className="mt-1 font-display text-xl font-bold text-navy-800 dark:text-white sm:text-2xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
