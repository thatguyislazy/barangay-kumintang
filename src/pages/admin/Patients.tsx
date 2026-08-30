import { useEffect, useMemo, useState } from "react";
import { Search, Users, Plus, Eye, Archive, Pencil } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, THead, TBody, Th, Td, EmptyState } from "../../components/ui/Table";
import { patientService } from "../../services/patientService";
import type { Patient } from "../../types/patient";

const emptyForm = {
  fullName: "",
  contactNumber: "",
  address: "",
  birthDate: "",
  sex: "Female" as "Male" | "Female",
};

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Archived">("Active");
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setPatients(await patientService.list());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.fullName.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setAddOpen(true);
  }

  function openEdit(patient: Patient) {
    setForm({
      fullName: patient.fullName,
      contactNumber: patient.contactNumber,
      address: patient.address,
      birthDate: patient.birthDate,
      sex: patient.sex,
    });
    setEditing(patient);
    setAddOpen(true);
  }

  async function handleSave() {
    if (!form.fullName.trim() || !form.contactNumber.trim()) return;
    setSaving(true);
    if (editing) {
      const updated = await patientService.update(editing.id, form);
      setPatients((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
    } else {
      const created = await patientService.create(form);
      setPatients((prev) => [created, ...prev]);
    }
    setSaving(false);
    setAddOpen(false);
  }

  async function handleArchive(id: string) {
    await patientService.archive(id);
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Archived" } : p)));
  }

  return (
    <AdminLayout title="Patient Records" description="Maintain resident health records on file.">
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-surface-border p-5 dark:border-white/10 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search patients..."
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="sm:min-w-[150px]"
          >
            <option value="All">All Patients</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </Select>
          <Button onClick={openAdd} className="shrink-0">
            <Plus className="h-4 w-4" /> Add Patient
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-soft dark:bg-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No patients found"
            description="Try adjusting your search or add a new patient."
            action={
              <Button variant="outline" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Patient
              </Button>
            }
          />
        ) : (
          <div className="p-5">
            <Table>
              <THead>
                <Th>Patient</Th>
                <Th>Contact</Th>
                <Th>Last Visit</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <TBody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <p className="font-semibold text-ink-900 dark:text-white">{p.fullName}</p>
                      <p className="text-xs text-ink-500 dark:text-white/50">{p.id}</p>
                    </Td>
                    <Td>{p.contactNumber}</Td>
                    <Td>{p.lastVisit ?? "—"}</Td>
                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewing(p)}
                          aria-label="View patient"
                          className="rounded-lg p-2 text-ink-500 hover:bg-surface-soft dark:text-white/50 dark:hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Edit patient"
                          className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 dark:hover:bg-navy-500/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {p.status === "Active" && (
                          <button
                            onClick={() => handleArchive(p.id)}
                            aria-label="Archive patient"
                            className="rounded-lg p-2 text-accent-red hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Archive className="h-4 w-4" />
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
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title="Patient Details"
        footer={
          <Button variant="outline" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-ink-500 dark:text-white/50">Full Name</span>
                <p className="font-semibold text-ink-900 dark:text-white">{viewing.fullName}</p>
              </div>
              <div>
                <span className="text-ink-500 dark:text-white/50">Sex</span>
                <p className="text-ink-900 dark:text-white">{viewing.sex}</p>
              </div>
              <div>
                <span className="text-ink-500 dark:text-white/50">Birth Date</span>
                <p className="text-ink-900 dark:text-white">{viewing.birthDate}</p>
              </div>
              <div>
                <span className="text-ink-500 dark:text-white/50">Contact</span>
                <p className="text-ink-900 dark:text-white">{viewing.contactNumber}</p>
              </div>
              <div className="col-span-2">
                <span className="text-ink-500 dark:text-white/50">Address</span>
                <p className="text-ink-900 dark:text-white">{viewing.address}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-ink-900 dark:text-white">
                Appointment History
              </p>
              {viewing.appointmentHistory.length === 0 ? (
                <p className="text-ink-500 dark:text-white/50">No appointment history yet.</p>
              ) : (
                <div className="space-y-2">
                  {viewing.appointmentHistory.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-lg border border-surface-border p-3 dark:border-white/10"
                    >
                      <div>
                        <p className="font-medium text-ink-900 dark:text-white">{record.reason}</p>
                        <p className="text-xs text-ink-500 dark:text-white/50">{record.date}</p>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit Patient" : "Add Patient"}
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editing ? "Save Changes" : "Add Patient"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Number"
              value={form.contactNumber}
              onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
              required
            />
            <Select
              label="Sex"
              value={form.sex}
              onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as "Male" | "Female" }))}
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </Select>
          </div>
          <Input
            label="Birth Date"
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
      </Modal>
    </AdminLayout>
  );
}
