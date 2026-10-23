import { useEffect, useMemo, useState } from "react";
import { Search, Pill, Plus, Pencil, Trash2, Minus } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, THead, TBody, Th, Td, EmptyState } from "../../components/ui/Table";
import { medicineService } from "../../services/medicineService";
import type { Medicine, StockStatus, MedicineFormData } from "../../types/medicine";

const emptyForm: MedicineFormData = {
  name: "",
  category: "",
  quantity: 0,
  unit: "tablets",
  expirationDate: "",
};

const statusOptions: (StockStatus | "All")[] = [
  "All",
  "In Stock",
  "Low Stock",
  "Out of Stock",
  "Expiring Soon",
];

export default function Medicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState<MedicineFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await medicineService.list();
      setMedicines(data);
    } catch (err) {
      console.error("Failed to fetch medicines:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [medicines, search, statusFilter]);

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setAddOpen(true);
  }

  function openEdit(med: Medicine) {
    setForm({
      name: med.name,
      category: med.category,
      quantity: med.quantity,
      unit: med.unit,
      expirationDate: med.expirationDate,
    });
    setEditing(med);
    setAddOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.expirationDate) return;
    try {
      setSaving(true);
      if (editing) {
        const updated = await medicineService.update(editing.id, form);
        setMedicines((prev) => prev.map((m) => (m.id === editing.id ? updated : m)));
      } else {
        const created = await medicineService.create(form);
        setMedicines((prev) => [created, ...prev]);
      }
      setAddOpen(false);
    } catch (err) {
      console.error("Failed to save medicine:", err);
      alert("Failed to save medicine to database.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Are you sure you want to delete this medicine record?")) return;
    try {
      await medicineService.remove(id);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Failed to delete medicine:", err);
      alert("Failed to delete medicine from database.");
    }
  }

  async function handleAdjust(id: string, delta: number) {
    try {
      const updated = await medicineService.adjustStock(id, delta);
      setMedicines((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      console.error("Failed to adjust stock:", err);
    }
  }

  return (
    <AdminLayout title="Medicine Inventory" description="Track stock levels and expiration dates.">
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-surface-border p-5 dark:border-white/10 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search medicine or category..."
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="sm:min-w-[170px]"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </Select>
          <Button onClick={openAdd} className="shrink-0 cursor-pointer">
            <Plus className="h-4 w-4" /> Add Medicine
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
            icon={<Pill className="h-10 w-10" />}
            title="No medicines found"
            description="Try adjusting your search or add a new medicine."
            action={
              <Button variant="outline" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Medicine
              </Button>
            }
          />
        ) : (
          <div className="p-5">
            <Table>
              <THead>
                <Th>Medicine</Th>
                <Th>Category</Th>
                <Th>Quantity</Th>
                <Th>Expiration</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <TBody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <Td>
                      <p className="font-semibold text-ink-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-ink-500 dark:text-white/50">{m.id}</p>
                    </Td>
                    <Td>
                      <span className="inline-flex rounded-md bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700 dark:bg-white/10 dark:text-white/80">
                        {m.category}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdjust(m.id, -1)}
                          disabled={m.quantity <= 0}
                          aria-label="Decrease stock"
                          className="rounded-md border border-surface-border p-1 text-ink-500 hover:bg-surface-soft disabled:opacity-30 dark:border-white/15 dark:text-white/60 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-16 text-center font-mono font-medium">
                          {m.quantity} {m.unit}
                        </span>
                        <button
                          onClick={() => handleAdjust(m.id, 1)}
                          aria-label="Increase stock"
                          className="rounded-md border border-surface-border p-1 text-ink-500 hover:bg-surface-soft dark:border-white/15 dark:text-white/60 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                    <Td className="text-xs">{m.expirationDate}</Td>
                    <Td>
                      <StatusBadge status={m.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(m)}
                          aria-label="Edit medicine"
                          className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 dark:hover:bg-navy-500/10 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(m.id)}
                          aria-label="Delete medicine"
                          className="rounded-lg p-2 text-accent-red hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit Medicine" : "Add Medicine"}
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editing ? "Save Changes" : "Add Medicine"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Medicine Name"
            placeholder="e.g. Paracetamol"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              placeholder="e.g. Analgesic, Antibiotic"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <Input
              label="Unit"
              placeholder="tablets, capsules, bottles"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              required
            />
            <Input
              label="Expiration Date"
              type="date"
              value={form.expirationDate}
              onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))}
              required
            />
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}