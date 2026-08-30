import { useEffect, useMemo, useState } from "react";
import { Search, CalendarClock, Eye, Check, X as XIcon, CheckCheck } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, THead, TBody, Th, Td, EmptyState } from "../../components/ui/Table";
import { appointmentService } from "../../services/appointmentService";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All");
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await appointmentService.list();
    setAppointments(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return appointments.filter((appt) => {
      const matchesSearch =
        appt.patientName.toLowerCase().includes(search.toLowerCase()) ||
        appt.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || appt.status === statusFilter;
      const matchesDate = !dateFilter || appt.date === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, search, statusFilter, dateFilter]);

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    setActionLoading(id);
    const updated = await appointmentService.updateStatus(id, status);
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    if (selected?.id === id) setSelected(updated);
    setActionLoading(null);
  }

  return (
    <AdminLayout title="Appointments" description="Manage and review resident appointment requests.">
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-surface-border p-5 dark:border-white/10 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search by patient name or ID..."
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
                <Th>Date & Time</Th>
                <Th>Reason</Th>
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
                      {appt.date}
                      <br />
                      <span className="text-xs text-ink-500 dark:text-white/50">{appt.time}</span>
                    </Td>
                    <Td>{appt.reason}</Td>
                    <Td>
                      <StatusBadge status={appt.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelected(appt)}
                          aria-label="View details"
                          className="rounded-lg p-2 text-ink-500 hover:bg-surface-soft dark:text-white/50 dark:hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {appt.status === "Pending" && (
                          <button
                            onClick={() => handleStatusChange(appt.id, "Confirmed")}
                            disabled={actionLoading === appt.id}
                            aria-label="Confirm"
                            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {appt.status === "Confirmed" && (
                          <button
                            onClick={() => handleStatusChange(appt.id, "Completed")}
                            disabled={actionLoading === appt.id}
                            aria-label="Mark completed"
                            className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 dark:hover:bg-navy-500/10"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </button>
                        )}
                        {appt.status !== "Cancelled" && appt.status !== "Completed" && (
                          <button
                            onClick={() => handleStatusChange(appt.id, "Cancelled")}
                            disabled={actionLoading === appt.id}
                            aria-label="Cancel"
                            className="rounded-lg p-2 text-accent-red hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <XIcon className="h-4 w-4" />
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

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Appointment Details"
        footer={
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
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
              <span className="text-ink-500 dark:text-white/50">Patient</span>
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
              <span className="text-ink-500 dark:text-white/50">Schedule</span>
              <span className="text-ink-900 dark:text-white">
                {selected.date} at {selected.time}
              </span>
            </div>
            <div>
              <span className="text-ink-500 dark:text-white/50">Reason</span>
              <p className="mt-1 text-ink-900 dark:text-white">{selected.reason}</p>
            </div>
            {selected.notes && (
              <div>
                <span className="text-ink-500 dark:text-white/50">Notes</span>
                <p className="mt-1 text-ink-900 dark:text-white">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
