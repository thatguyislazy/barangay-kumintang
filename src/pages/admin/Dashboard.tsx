import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Users,
  Pill,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import { appointmentService } from "../../services/appointmentService";
import { patientService } from "../../services/patientService";
import { medicineService } from "../../services/medicineService";
import { useAuth } from "../../context/AuthContext";
import type { Appointment } from "../../types/appointment";

interface Stats {
  appointmentsToday: { total: number; pending: number; confirmed: number; completed: number };
  totalPatients: number;
  medicines: { total: number; lowStock: number; outOfStock: number };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const todayStr = new Date().toISOString().split("T")[0];
      const [patients, medicines, appointments] = await Promise.all([
        patientService.list(),
        medicineService.list(),
        appointmentService.list(),
      ]);

      const todayAppointments = appointments.filter((a) => a.date === todayStr);

      setStats({
        appointmentsToday: {
          total: todayAppointments.length,
          pending: todayAppointments.filter((a) => a.status === "Pending").length,
          confirmed: todayAppointments.filter((a) => a.status === "Confirmed").length,
          completed: todayAppointments.filter((a) => a.status === "Completed").length,
        },
        totalPatients: patients.filter((p: any) => p.status === "Active").length,
        medicines: {
          total: medicines.length,
          lowStock: medicines.filter((m: any) => m.status === "Low Stock").length,
          outOfStock: medicines.filter((m: any) => m.status === "Out of Stock").length,
        },
      });
      setRecent(appointments.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AdminLayout
      title={`Welcome back, ${user?.fullName?.split(" ")[0] ?? "Admin"}`}
      description="Here's what's happening at the barangay today."
    >
      {loading || !stats ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-surface-soft dark:bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <div className="flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700 dark:bg-navy-500/15 dark:text-navy-300">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-ink-400">Today</span>
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-navy-900 dark:text-white">
                {stats.appointmentsToday.total}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Today's Appointments
              </p>
              <div className="mt-3 flex gap-4 text-xs text-ink-500 dark:text-white/50">
                <span>{stats.appointmentsToday.pending} pending</span>
                <span>{stats.appointmentsToday.confirmed} confirmed</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-navy-900 dark:text-white">
                {stats.totalPatients}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Active Patients
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/20 text-accent-gold-dark">
                  <Pill className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-navy-900 dark:text-white">
                {stats.medicines.total}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Medicines in Inventory
              </p>
              <div className="mt-3 flex gap-4 text-xs text-ink-500 dark:text-white/50">
                <span>{stats.medicines.lowStock} low stock</span>
                <span>{stats.medicines.outOfStock} out of stock</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-accent-red dark:bg-red-500/15">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-navy-900 dark:text-white">
                {stats.medicines.lowStock + stats.medicines.outOfStock}
              </p>
              <p className="text-sm font-medium text-ink-500 dark:text-white/50">
                Needs Restocking
              </p>
              <Link
                to="/admin/medicines"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline dark:text-navy-300"
              >
                View inventory <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2" padded={false}>
              <div className="flex items-center justify-between px-6 pt-6">
                <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                  Recent Appointments
                </h2>
                <Link
                  to="/admin/appointments"
                  className="text-xs font-semibold text-navy-700 hover:underline dark:text-navy-300"
                >
                  View all
                </Link>
              </div>
              <div className="mt-4 divide-y divide-surface-border dark:divide-white/10">
                {recent.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">
                        {appt.patientName}
                      </p>
                      <p className="text-xs text-ink-500 dark:text-white/50">
                        {appt.reason} · {appt.date} at {appt.time}
                      </p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                Quick Summary
              </h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-4 w-4 text-accent-gold-dark" aria-hidden="true" />
                  <p className="text-sm text-ink-600 dark:text-white/60">
                    {stats.appointmentsToday.pending} appointments awaiting confirmation
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <p className="text-sm text-ink-600 dark:text-white/60">
                    {stats.appointmentsToday.completed} appointments completed today
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-accent-red" aria-hidden="true" />
                  <p className="text-sm text-ink-600 dark:text-white/60">
                    {stats.medicines.outOfStock} medicine(s) out of stock
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </AdminLayout>
  );
}