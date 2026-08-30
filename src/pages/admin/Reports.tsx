import { useEffect, useState } from "react";
import { Download, CalendarRange, Users, Pill, CalendarClock } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { reportService } from "../../services/reportService";
import type { ReportSummary } from "../../types/report";

export default function Reports() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("this-month");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setSummary(await reportService.summary());
      setLoading(false);
    }
    load();
  }, []);

  const maxStatus = summary
    ? Math.max(...summary.appointmentsByStatus.map((s) => s.value), 1)
    : 1;
  const maxMonth = summary
    ? Math.max(...summary.appointmentsByMonth.map((m) => m.count), 1)
    : 1;

  return (
    <AdminLayout title="Reports" description="Statistics to support administrative decisions.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2 text-sm text-ink-600 dark:border-white/10 dark:bg-navy-800/60 dark:text-white/70">
          <CalendarRange className="h-4 w-4 text-navy-600 dark:text-navy-300" aria-hidden="true" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-transparent font-medium focus:outline-none"
          >
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="this-quarter">This Quarter</option>
            <option value="this-year">This Year</option>
          </select>
        </div>
        <Button variant="outline" onClick={() => alert("Export coming soon — connect a backend to enable this.")}>
          <Download className="h-4 w-4" /> Export Report
        </Button>
      </div>

      {loading || !summary ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-surface-soft dark:bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700 dark:bg-navy-500/15 dark:text-navy-300">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-2xl font-extrabold text-navy-900 dark:text-white">
                {summary.totalAppointments}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Total Appointments
              </p>
            </Card>
            <Card>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-2xl font-extrabold text-navy-900 dark:text-white">
                {summary.totalPatients}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Active Patients
              </p>
            </Card>
            <Card>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/20 text-accent-gold-dark">
                <Pill className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-2xl font-extrabold text-navy-900 dark:text-white">
                {summary.totalMedicines}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Medicines Tracked
              </p>
            </Card>
            <Card>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-accent-red dark:bg-red-500/15">
                <Pill className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-2xl font-extrabold text-navy-900 dark:text-white">
                {summary.lowStockCount}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Needs Restocking
              </p>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card>
              <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                Appointments by Status
              </h2>
              <div className="mt-6 space-y-4">
                {summary.appointmentsByStatus.map((s) => (
                  <div key={s.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-700 dark:text-white/70">
                        {s.label}
                      </span>
                      <span className="text-ink-500 dark:text-white/50">{s.value}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-soft dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-navy-700 dark:bg-navy-400"
                        style={{ width: `${(s.value / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                Appointments by Month
              </h2>
              <div className="mt-6 flex h-48 items-end gap-4">
                {summary.appointmentsByMonth.length === 0 ? (
                  <p className="text-sm text-ink-500 dark:text-white/50">No data available yet.</p>
                ) : (
                  summary.appointmentsByMonth.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-36 w-full items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-navy-700 to-navy-400 dark:from-navy-600 dark:to-navy-300"
                          style={{ height: `${(m.count / maxMonth) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-ink-500 dark:text-white/50">
                        {m.month}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
