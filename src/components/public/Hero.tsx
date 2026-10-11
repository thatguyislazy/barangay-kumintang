import { useState, useEffect, useCallback } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone, Loader2 } from "lucide-react";
import { barangayConfig } from "../../config/barangay";
import { announcementService } from "../../services/announcementService";
import type { Announcement } from "../../types/announcement";

export function Hero() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active announcements asynchronously from Supabase
  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const active = await announcementService.getActive();
      setAnnouncements(active);
    } catch (err) {
      console.error("Hero: Failed to load announcements from Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    const handleUpdate = () => {
      fetchAnnouncements();
    };

    window.addEventListener("announcements_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("announcements_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [fetchAnnouncements]);

  // Auto-play carousel every 6 seconds if multiple announcements exist
  useEffect(() => {
    if (announcements.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [announcements.length, isPaused]);

  // Keep index within array bounds if announcement list changes
  useEffect(() => {
    if (currentIndex >= announcements.length && announcements.length > 0) {
      setCurrentIndex(0);
    }
  }, [announcements.length, currentIndex]);

  const hasAnnouncements = announcements.length > 0;
  const currentAnnouncement = announcements[currentIndex] || announcements[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? announcements.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  // Keep column layout fixed at 7/5 during loading or when announcements exist
  const showRightColumn = isLoading || hasAnnouncements;

  return (
    <section id="home" className="relative overflow-hidden">
      {/* Background Graphic & Gradient Overlays */}
      <div className="absolute inset-0">
        <img
          src={barangayConfig.heroImage}
          alt={`Barangay Hall of ${barangayConfig.name}`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70 dark:from-navy-950 dark:via-navy-950/90 dark:to-navy-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-navy-950" />
      </div>

      <div className="container-page relative flex min-h-[640px] items-center py-20 lg:min-h-[720px]">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Hero Text & Call-To-Action */}
          <div className={showRightColumn ? "lg:col-span-7" : "max-w-2xl lg:col-span-12"}>
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

          {/* Right Column: Loading Skeleton or Announcement Carousel */}
          {isLoading ? (
            <div className="w-full lg:col-span-5">
              <div className="relative flex min-h-[460px] flex-col justify-center items-center overflow-hidden rounded-3xl border border-navy-200/60 bg-white/40 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-navy-900/40">
                <Loader2 className="h-8 w-8 animate-spin text-navy-700 dark:text-white/60" />
                <span className="mt-3 text-xs font-medium text-ink-500 dark:text-white/50">
                  Loading latest announcements...
                </span>
              </div>
            </div>
          ) : hasAnnouncements && currentAnnouncement ? (
            <div
              className="w-full lg:col-span-5"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="relative min-h-[460px] flex flex-col overflow-hidden rounded-3xl border border-navy-200/80 bg-white/85 p-5 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-navy-900/85 sm:p-6 transition-all duration-300">
                {/* Header Badge & Navigation */}
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-navy-800 dark:text-white">
                      {currentAnnouncement.badge ? currentAnnouncement.badge : "Community Announcement"}
                    </span>
                  </div>

                  {announcements.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handlePrev}
                        aria-label="Previous announcement"
                        className="rounded-lg p-1 text-ink-500 hover:bg-navy-100 dark:text-white/60 dark:hover:bg-white/10 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-medium text-ink-400 dark:text-white/40">
                        {currentIndex + 1} / {announcements.length}
                      </span>
                      <button
                        onClick={handleNext}
                        aria-label="Next announcement"
                        className="rounded-lg p-1 text-ink-500 hover:bg-navy-100 dark:text-white/60 dark:hover:bg-white/10 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Announcement Media */}
                {currentAnnouncement.imageUrl ? (
                  <div className="mb-4 h-48 w-full overflow-hidden rounded-2xl bg-navy-950/20 shadow-inner">
                    <img
                      key={currentAnnouncement.imageUrl}
                      src={currentAnnouncement.imageUrl}
                      alt={currentAnnouncement.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex h-24 items-center justify-center rounded-2xl bg-navy-50/80 dark:bg-white/5">
                    <Megaphone className="h-8 w-8 text-navy-400 dark:text-white/30" />
                  </div>
                )}

                {/* Announcement Content */}
                <div key={currentAnnouncement.id} className="animate-fadeIn flex-1">
                  <h3 className="font-display text-xl font-bold leading-snug text-navy-900 dark:text-white">
                    {currentAnnouncement.title}
                  </h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-ink-600 dark:text-white/75">
                    {currentAnnouncement.content}
                  </p>

                  {currentAnnouncement.linkUrl && (
                    <a
                      href={currentAnnouncement.linkUrl}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-800 dark:text-navy-300 dark:hover:text-white transition-colors"
                    >
                      Read full advisory
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {/* Pagination Dots */}
                {announcements.length > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-1.5 pt-2">
                    {announcements.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          currentIndex === i
                            ? "w-6 bg-navy-700 dark:bg-navy-300"
                            : "w-1.5 bg-navy-200 dark:bg-white/20 hover:bg-navy-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}