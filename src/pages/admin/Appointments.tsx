import { useEffect, useMemo, useState } from "react";
import {
  Search,
  CalendarClock,
  Eye,
  CheckCheck,
  ShieldCheck,
  ExternalLink,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CalendarPlus,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, THead, TBody, Th, Td, EmptyState } from "../../components/ui/Table";
import { appointmentService, CLINIC_20_SLOTS } from "../../services/appointmentService";
import type { Appointment, AppointmentStatus } from "../../types/appointment";

const statusOptions: (AppointmentStatus | "All")[] = [
  "All",
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All");
  const [dateFilter, setDateFilter] = useState("");

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Modals & Action
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Admin Assignment inputs in modal
  const [assignedDate, setAssignedDate] = useState("");
  const [assignedTime, setAssignedTime] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  async function load() {
    try {
      setLoading(true);
      const data = await appointmentService.list();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Fetch taken slots when assigned date changes in modal
  useEffect(() => {
    if (!assignedDate) {
      setTakenSlots([]);
      return;
    }

    async function fetchTaken() {
      const taken = await appointmentService.getTakenTimeSlots(assignedDate);
      setTakenSlots(taken);
      // If current assignedTime is taken, find first available
      if (taken.includes(assignedTime)) {
        const firstAvailable = CLINIC_20_SLOTS.find((s) => !taken.includes(s)) || "";
        setAssignedTime(firstAvailable);
      }
    }

    fetchTaken();
  }, [assignedDate]);

  const filtered = useMemo(() => {
    return appointments.filter((appt) => {
      const matchesSearch =
        appt.patientName.toLowerCase().includes(search.toLowerCase()) ||
        appt.id.toLowerCase().includes(search.toLowerCase()) ||
        appt.reason.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || appt.status === statusFilter;
      const matchesDate = !dateFilter || appt.date === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, search, statusFilter, dateFilter]);

  function handleOpenModal(appt: Appointment) {
    setSelected(appt);
    const defaultDate = appt.date || new Date().toISOString().split("T")[0];
    setAssignedDate(defaultDate);
    setAssignedTime(appt.time || CLINIC_20_SLOTS[0]);
    setAssignError(null);
  }

  async function handleApproveWithSchedule() {
    if (!selected) return;
    if (!assignedDate || !assignedTime) {
      setAssignError("Please specify both Date and Time before confirming.");
      return;
    }

    try {
      setActionLoading(selected.id);
      setAssignError(null);
      const updated = await appointmentService.updateScheduleAndStatus(selected.id, {
        date: assignedDate,
        time: assignedTime,
        status: "Confirmed",
      });
      setAppointments((prev) => prev.map((a) => (a.id === selected.id ? updated : a)));
      setSelected(null);
    } catch (err: unknown) {
      console.error("Failed to approve appointment:", err);
      const msg = err instanceof Error ? err.message : "Failed to confirm appointment.";
      setAssignError(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    try {
      setActionLoading(id);
      const updated = await appointmentService.updateStatus(id, status);
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (selected?.id === id) setSelected(updated);
    } catch (err) {
      console.error("Failed to change status:", err);
      alert("Failed to update status on Supabase.");
    } finally {
      setActionLoading(null);
    }
  }

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push(dateString);
    }
    return days;
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      if (appt.date) {
        if (!map[appt.date]) map[appt.date] = [];
        map[appt.date].push(appt);
      }
    });
    return map;
  }, [appointments]);

  const selectedDateBookings = useMemo(() => {
    return (appointmentsByDate[selectedCalendarDate] || []).sort((a, b) =>
      (a.time || "").localeCompare(b.time || "")
    );
  }, [appointmentsByDate, selectedCalendarDate]);

  return (
    <AdminLayout
      title="Appointments Schedule"
      description="Manage resident appointments, 20 slots/day (8:00 AM – 5:00 PM), and PhilSys residency ID verification."
    >
      <div className="space-y-6">
        {/* View Switcher Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-navy-900">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                viewMode === "calendar"
                  ? "bg-navy-800 text-white shadow-soft dark:bg-navy-600"
                  : "text-ink-600 hover:text-navy-900 dark:text-white/60 dark:hover:text-white"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-navy-800 text-white shadow-soft dark:bg-navy-600"
                  : "text-ink-600 hover:text-navy-900 dark:text-white/60 dark:hover:text-white"
              }`}
            >
              <List className="h-4 w-4" />
              Table View
            </button>
          </div>

          <div className="text-xs text-ink-500 dark:text-white/60">
            Clinic Schedule: <span className="font-semibold text-emerald-600 dark:text-emerald-400">8:00 AM – 5:00 PM</span> (20-minute slots • Max 20/day)
          </div>
        </div>

        {/* CALENDAR VIEW */}
        {viewMode === "calendar" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <div className="flex items-center justify-between pb-4 border-b border-navy-100 dark:border-white/10">
                <h2 className="font-display text-lg font-bold text-navy-900 dark:text-white">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                    }
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-navy-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-navy-700 hover:bg-navy-50 dark:text-white/80 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={() =>
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                    }
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-navy-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-ink-400 dark:text-white/40">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {daysInMonth.map((dateStr, idx) => {
                  if (!dateStr) {
                    return <div key={`empty-${idx}`} className="h-20 rounded-xl" />;
                  }

                  const dayNum = parseInt(dateStr.split("-")[2], 10);
                  const activeCount = (appointmentsByDate[dateStr] || []).filter(
                    (a) => a.status !== "Cancelled"
                  ).length;
                  const isSelected = selectedCalendarDate === dateStr;
                  const isToday = dateStr === new Date().toISOString().split("T")[0];
                  const isFull = activeCount >= 20;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedCalendarDate(dateStr)}
                      className={`relative flex h-20 flex-col items-center justify-between rounded-xl p-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-2 border-navy-800 bg-navy-50/70 dark:border-navy-400 dark:bg-navy-800/40"
                          : "border border-navy-100 hover:bg-surface-soft dark:border-white/5 dark:hover:bg-white/5"
                      } ${isToday ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                    >
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-navy-900 dark:text-white"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {activeCount > 0 && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-xs ${
                            isFull ? "bg-rose-600" : "bg-navy-800 dark:bg-navy-500"
                          }`}
                        >
                          {activeCount}/20
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="lg:col-span-5">
              <div className="flex items-center justify-between border-b border-navy-100 pb-4 dark:border-white/10">
                <div>
                  <h3 className="font-display font-bold text-navy-900 dark:text-white">
                    Schedule for {selectedCalendarDate}
                  </h3>
                  <p className="text-xs text-ink-500 dark:text-white/60">
                    {selectedDateBookings.length} confirmed patient(s)
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {selectedDateBookings.length === 0 ? (
                  <div className="py-12 text-center text-sm text-ink-500 dark:text-white/40">
                    <CalendarClock className="mx-auto h-8 w-8 stroke-1" />
                    <p className="mt-2 font-medium">No confirmed bookings on this date.</p>
                  </div>
                ) : (
                  selectedDateBookings.map((appt) => (
                    <div
                      key={appt.id}
                      className="rounded-xl border border-navy-100 bg-white p-3.5 shadow-xs transition hover:shadow-sm dark:border-white/10 dark:bg-navy-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-navy-900 dark:text-white text-sm">
                            <User className="h-3.5 w-3.5 text-navy-600 dark:text-navy-400" />
                            {appt.patientName}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-ink-500 dark:text-white/50">
                            <Clock className="h-3 w-3" />
                            <span>{appt.time}</span>
                            <span className="mx-1">•</span>
                            <span className="font-medium text-navy-700 dark:text-navy-300">{appt.reason}</span>
                          </div>
                        </div>
                        <StatusBadge status={appt.status} />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-navy-50 pt-2.5 dark:border-white/5">
                        <span className="text-[11px] text-ink-400 dark:text-white/40">{appt.id}</span>
                        <button
                          onClick={() => handleOpenModal(appt)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-white/5 cursor-pointer"
                        >
                          Review & Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        ) : (
          /* TABLE VIEW */
          <Card padded={false}>
            <div className="flex flex-col gap-3 border-b border-surface-border p-5 dark:border-white/10 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search by patient name, ID, or reason..."
                  icon={<Search className="h-4 w-4" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="min-w-[150px]"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "All" ? "All Statuses" : s}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="min-w-[150px]"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-soft dark:bg-white/5" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-10 w-10" />}
                title="No appointments found"
                description="Try adjusting your search or filters."
              />
            ) : (
              <div className="p-5">
                <Table>
                  <THead>
                    <Th>Patient</Th>
                    <Th>ID Proof</Th>
                    <Th>Reason</Th>
                    <Th>Assigned Schedule</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </THead>
                  <TBody>
                    {filtered.map((appt) => (
                      <tr key={appt.id}>
                        <Td>
                          <p className="font-semibold text-ink-900 dark:text-white">
                            {appt.patientName}
                          </p>
                          <p className="text-xs text-ink-500 dark:text-white/50">{appt.id}</p>
                        </Td>
                        <Td>
                          {appt.idPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() => handleOpenModal(appt)}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              View ID
                            </button>
                          ) : (
                            <span className="text-xs text-ink-400 dark:text-white/40">No ID</span>
                          )}
                        </Td>
                        <Td>
                          <span className="font-medium text-navy-800 dark:text-white">{appt.reason}</span>
                        </Td>
                        <Td>
                          {appt.date && appt.time ? (
                            <div>
                              <span>{appt.date}</span>
                              <br />
                              <span className="text-xs text-ink-500 dark:text-white/50">{appt.time}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                              Unscheduled
                            </span>
                          )}
                        </Td>
                        <Td>
                          <StatusBadge status={appt.status} />
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(appt)}
                              aria-label="Assign & Review"
                              title="Assign Schedule & Review"
                              className="rounded-lg p-2 text-ink-500 hover:bg-surface-soft dark:text-white/50 dark:hover:bg-white/10 cursor-pointer"
                            >
                              {appt.status === "Pending" ? (
                                <CalendarPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                            {appt.status === "Confirmed" && (
                              <button
                                onClick={() => handleStatusChange(appt.id, "Completed")}
                                disabled={actionLoading === appt.id}
                                aria-label="Mark completed"
                                className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 dark:hover:bg-navy-500/10 cursor-pointer"
                              >
                                <CheckCheck className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Admin Review & Schedule Assignment Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Residency Review & Schedule Assignment"
        footer={
          <div className="flex w-full items-center justify-between">
            <div>
              {selected?.status === "Pending" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selected) handleStatusChange(selected.id, "Cancelled");
                      setSelected(null);
                    }}
                  >
                    Reject Request
                  </Button>
                  <Button
                    onClick={handleApproveWithSchedule}
                    isLoading={actionLoading === selected.id}
                  >
                    Approve & Assign Schedule
                  </Button>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-white/50">Reference ID</span>
              <span className="font-semibold text-ink-900 dark:text-white">{selected.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-white/50">Status</span>
              <StatusBadge status={selected.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-white/50">Patient Name</span>
              <span className="font-semibold text-ink-900 dark:text-white">
                {selected.patientName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-white/50">Contact</span>
              <span className="text-ink-900 dark:text-white">{selected.contactNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-white/50">Barangay</span>
              <span className="text-ink-900 dark:text-white">{selected.barangay}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-white/50">Service Requested</span>
              <span className="font-semibold text-navy-800 dark:text-emerald-400">
                {selected.reason}
              </span>
            </div>

            {/* Admin Date & Time Selection Section */}
            {selected.status === "Pending" ? (
              <div className="rounded-xl border border-navy-200 bg-navy-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                <span className="block font-semibold text-navy-900 dark:text-white mb-2">
                  Assign Clinic Appointment Date & Time
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-ink-600 dark:text-white/70 mb-1">
                      Checkup Date *
                    </label>
                    <input
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs text-navy-900 outline-none dark:border-white/15 dark:bg-navy-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 dark:text-white/70 mb-1">
                      Time Slot (20-min slots • 8:00 AM – 5:00 PM) *
                    </label>
                    <select
                      value={assignedTime}
                      onChange={(e) => setAssignedTime(e.target.value)}
                      className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs text-navy-900 outline-none dark:border-white/15 dark:bg-navy-900 dark:text-white cursor-pointer"
                      required
                    >
                      {CLINIC_20_SLOTS.map((slot) => {
                        const isTaken = takenSlots.includes(slot);
                        return (
                          <option key={slot} value={slot} disabled={isTaken}>
                            {slot} {isTaken ? "(Occupied)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                {assignError && (
                  <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {assignError}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-ink-500 dark:text-white/50">Scheduled Schedule</span>
                <span className="font-semibold text-ink-900 dark:text-white">
                  {selected.date} at {selected.time}
                </span>
              </div>
            )}

            {/* Proof of Residency Photo Viewer */}
            <div className="rounded-xl border border-navy-100 bg-surface-soft/40 p-3.5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-ink-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Submitted PhilSys / Valid ID
                </span>
                {selected.idPhotoUrl && (
                  <a
                    href={selected.idPhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open Full Image
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {selected.idPhotoUrl ? (
                <div className="overflow-hidden rounded-lg border border-navy-200 dark:border-white/10">
                  <img
                    src={selected.idPhotoUrl}
                    alt="Proof of Residency"
                    className="max-h-60 w-full object-contain bg-black/5 dark:bg-black/30"
                  />
                </div>
              ) : (
                <p className="text-xs text-ink-400 italic">No government ID uploaded.</p>
              )}
            </div>

            {selected.notes && (
              <div>
                <span className="text-ink-500 dark:text-white/50">Resident Notes</span>
                <p className="mt-1 text-ink-900 dark:text-white">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}