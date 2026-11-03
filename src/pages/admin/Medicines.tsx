import { useEffect, useMemo, useState } from "react";
import { Search, Pill, Plus, Pencil, Trash2, Minus, FileText, Printer } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, THead, TBody, Th, Td, EmptyState } from "../../components/ui/Table";
import { medicineService } from "../../services/medicineService";
import { requisitionService } from "../../services/requisitionService";
import type { Medicine, StockStatus, MedicineFormData } from "../../types/medicine";
import type { RequisitionOrder } from "../../types/requisition";

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
  const [requisitions, setRequisitions] = useState<RequisitionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All");
  const [activeTab, setActiveTab] = useState<"inventory" | "requisitions">("inventory");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState<MedicineFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [requisitionOpen, setRequisitionOpen] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqForm, setReqForm] = useState({
    requestedBy: "Juan Dela Cruz",
    position: "Barangay Health Worker",
    department: "Health Center",
    purpose:
      "The requested medicines are intended to replenish the health center's inventory and ensure sufficient medical supplies for residents requiring healthcare services.",
    remarks:
      "The current medicine stock is insufficient and requires replenishment to maintain the availability of essential medical supplies.",
  });
  const [selectedReqItems, setSelectedReqItems] = useState<
    { name: string; quantity: number; unit: string; dosage: string }[]
  >([]);

  async function load() {
    try {
      setLoading(true);
      const [medData, reqData] = await Promise.all([
        medicineService.list(),
        requisitionService.list(),
      ]);
      setMedicines(medData);
      setRequisitions(reqData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
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

  const openRequisitionModal = () => {
    const lowOrOut = medicines
      .filter((m) => m.status === "Low Stock" || m.status === "Out of Stock" || m.quantity <= 10)
      .map((m) => ({
        name: m.name,
        dosage: m.dosage || "500 mg",
        quantity: 50,
        unit: m.unit,
      }));

    setSelectedReqItems(
      lowOrOut.length > 0
        ? lowOrOut
        : [
            { name: "Paracetamol", dosage: "500 mg", quantity: 100, unit: "Tablets" },
            { name: "Cetirizine", dosage: "10 mg", quantity: 50, unit: "Tablets" },
            { name: "Vitamin C", dosage: "500 mg", quantity: 100, unit: "Tablets" },
          ]
    );
    setRequisitionOpen(true);
  };

  const handleCreateRequisition = async () => {
    try {
      setSubmittingReq(true);
      await requisitionService.create({
        requestedBy: reqForm.requestedBy,
        position: reqForm.position,
        department: reqForm.department,
        purpose: reqForm.purpose,
        remarks: reqForm.remarks,
        items: selectedReqItems.map((i) => ({
          medicineName: i.name,
          dosage: i.dosage,
          quantity: i.quantity,
          unit: i.unit,
        })),
      });
      const updatedReqs = await requisitionService.list();
      setRequisitions(updatedReqs);
      setRequisitionOpen(false);
      alert("Requisition order successfully submitted!");
    } catch (err) {
      console.error("Failed to submit requisition:", err);
      alert("Failed to submit requisition order.");
    } finally {
      setSubmittingReq(false);
    }
  };

  const handlePrintRequisitionPDF = (req: RequisitionOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsRows = req.items
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #333; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #333; font-weight: 500;">${item.medicineName}</td>
          <td style="padding: 8px; border: 1px solid #333; text-align: center;">${item.dosage || "N/A"}</td>
          <td style="padding: 8px; border: 1px solid #333; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="padding: 8px; border: 1px solid #333; text-align: center;">${item.unit}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Requisition Order - ${req.requestNo}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 20px; line-height: 1.5; font-size: 13px; background: #fff; }
            
            .header-container { display: flex; align-items: center; justify-content: center; border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; position: relative; }
            .logo { width: 65px; height: 65px; position: absolute; left: 10px; object-fit: contain; }
            .header-text { text-align: center; width: 100%; }
            .header-text h2 { margin: 0; font-size: 16px; font-weight: 700; color: #1e3a8a; letter-spacing: 0.5px; }
            .header-text h3 { margin: 3px 0; font-size: 13px; font-weight: normal; color: #4b5563; }
            .header-text h4 { margin: 8px 0 0 0; font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }

            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 15px; margin-bottom: 20px; }
            .meta-table { width: 100%; border-collapse: collapse; }
            .meta-table td { padding: 5px 0; vertical-align: top; font-size: 12.5px; }
            .meta-table strong { color: #334155; }

            .section-title { font-weight: 700; text-transform: uppercase; margin-top: 20px; margin-bottom: 8px; font-size: 12px; color: #1e3a8a; border-left: 3px solid #1e3a8a; padding-left: 6px; }
            
            .items-table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 15px; }
            .items-table th { border: 1px solid #333; padding: 8px; background-color: #f1f5f9; font-weight: 700; text-align: left; font-size: 11.5px; color: #0f172a; text-transform: uppercase; }
            .items-table td { font-size: 12.5px; }

            .content-box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 12px; margin-top: 5px; font-size: 12.5px; color: #374151; }

            .signatures-table { width: 100%; border-collapse: collapse; margin-top: 40px; page-break-inside: avoid; }
            .signatures-table td { width: 50%; vertical-align: top; padding: 0 15px; }
            .sig-line { border-bottom: 1px solid #000; margin-top: 50px; margin-bottom: 5px; }
            .sig-name { font-weight: bold; font-size: 13px; color: #0f172a; }
            .sig-title { font-size: 11px; color: #6b7280; }

            .footer-note { margin-top: 40px; font-size: 10.5px; font-style: italic; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px; text-align: justify; }

            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <img src="/favicon.png" class="logo" alt="Barangay Seal" />
            <div class="header-text">
              <h2>BARANGAY KUMINTANG ILAYA HEALTH CENTER</h2>
              <h3>Batangas City, Philippines</h3>
              <h4>MEDICINE PURCHASE / REQUISITION ORDER</h4>
            </div>
          </div>

          <div class="meta-box">
            <table class="meta-table">
              <tr>
                <td style="width: 55%;"><strong>Request No.:</strong> <span style="font-family: monospace; font-weight: bold; color: #2563eb;">${req.requestNo}</span></td>
                <td style="width: 45%;"><strong>Request Date:</strong> ${req.requestDate}</td>
              </tr>
              <tr>
                <td><strong>Requested By:</strong> ${req.requestedBy}</td>
                <td><strong>Position:</strong> ${req.position}</td>
              </tr>
              <tr>
                <td><strong>Department:</strong> ${req.department}</td>
                <td></td>
              </tr>
            </table>
          </div>

          <div class="section-title">Medicine Details</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">No.</th>
                <th style="width: 42%;">Medicine Name</th>
                <th style="width: 18%; text-align: center;">Dosage</th>
                <th style="width: 16%; text-align: center;">Quantity</th>
                <th style="width: 16%; text-align: center;">Unit</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="section-title">Purpose of Request</div>
          <div class="content-box">
            ${req.purpose}
          </div>

          <div class="section-title">Request Remarks</div>
          <div class="content-box">
            ${req.remarks}
          </div>

          <table class="signatures-table">
            <tr>
              <td>
                <div style="font-size: 12px; font-weight: 600; color: #475569;">Requested By:</div>
                <div class="sig-line"></div>
                <div class="sig-name">${req.requestedBy}</div>
                <div class="sig-title">${req.position}</div>
              </td>
              <td>
                <div style="font-size: 12px; font-weight: 600; color: #475569;">Reviewed / Approved By:</div>
                <div class="sig-line"></div>
                <div class="sig-name">Health Center Administrator</div>
                <div class="sig-title">Date Approved: ____________________</div>
              </td>
            </tr>
          </table>

          <div class="footer-note">
            <strong>Note:</strong> Medicine names and quantities are generated for health center requisition. This document requires physical review and manual approval signatures from authorized health personnel.
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AdminLayout title="Medicine Inventory & Requisition" description="Track stock levels and manage purchase orders.">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-surface-border pb-4 dark:border-white/10">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("inventory")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-navy-800 text-white shadow-soft dark:bg-navy-600"
                  : "bg-surface-soft text-ink-600 hover:bg-navy-100 dark:bg-white/5 dark:text-white/70"
              }`}
            >
              Inventory Stock
            </button>
            <button
              onClick={() => setActiveTab("requisitions")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "requisitions"
                  ? "bg-navy-800 text-white shadow-soft dark:bg-navy-600"
                  : "bg-surface-soft text-ink-600 hover:bg-navy-100 dark:bg-white/5 dark:text-white/70"
              }`}
            >
              Requisition Orders ({requisitions.length})
            </button>
          </div>

          <div className="flex gap-2">
            <Button onClick={openRequisitionModal} variant="outline" className="cursor-pointer">
              <FileText className="h-4 w-4 text-blue-600" /> Request Requisition Order
            </Button>
            <Button onClick={openAdd} className="cursor-pointer">
              <Plus className="h-4 w-4" /> Add Medicine
            </Button>
          </div>
        </div>

        {activeTab === "inventory" ? (
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
        ) : (
          <Card padded={false}>
            <div className="p-5 border-b border-surface-border dark:border-white/10">
              <h2 className="font-display font-bold text-navy-900 dark:text-white">
                Medicine Purchase / Requisition Orders
              </h2>
              <p className="text-xs text-ink-500 dark:text-white/60">
                Manage replenishment requests for low stock and out of stock medicines.
              </p>
            </div>

            <div className="p-5">
              {requisitions.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-10 w-10" />}
                  title="No requisition orders"
                  description="Click 'Request Requisition Order' to generate a purchase request for low stock items."
                  action={
                    <Button onClick={openRequisitionModal}>
                      <Plus className="h-4 w-4" /> Request Requisition Order
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <THead>
                    <Th>Request No.</Th>
                    <Th>Request Date</Th>
                    <Th>Requested By</Th>
                    <Th>Items Count</Th>
                    <Th className="text-right">Action</Th>
                  </THead>
                  <TBody>
                    {requisitions.map((req) => (
                      <tr key={req.id}>
                        <Td className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {req.requestNo}
                        </Td>
                        <Td>{req.requestDate}</Td>
                        <Td>
                          <p className="font-semibold text-navy-900 dark:text-white">
                            {req.requestedBy}
                          </p>
                          <p className="text-xs text-ink-500 dark:text-white/50">{req.position}</p>
                        </Td>
                        <Td>{req.items.length} medicine(s)</Td>
                        <Td className="text-right">
                          <button
                            onClick={() => handlePrintRequisitionPDF(req)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 shadow-soft hover:bg-navy-50 dark:border-white/10 dark:bg-navy-800 dark:text-white cursor-pointer active:scale-95 transition-all"
                          >
                            <Printer className="h-3.5 w-3.5 text-blue-600" />
                            Print / Export PDF
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>
          </Card>
        )}
      </div>

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
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: Math.max(0, parseInt(e.target.value, 10) || 0) }))
              }
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

      <Modal
        isOpen={requisitionOpen}
        onClose={() => setRequisitionOpen(false)}
        title="BARANGAY KUMINTANG ILAYA HEALTH CENTER - Requisition Order"
        footer={
          <>
            <Button variant="outline" onClick={() => setRequisitionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequisition} isLoading={submittingReq}>
              Submit Requisition Order
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Requested By"
              value={reqForm.requestedBy}
              onChange={(e) => setReqForm({ ...reqForm, requestedBy: e.target.value })}
            />
            <Input
              label="Position"
              value={reqForm.position}
              onChange={(e) => setReqForm({ ...reqForm, position: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Medicines to Replenish</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-surface-border p-2 rounded-xl dark:border-white/10">
              {selectedReqItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedReqItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, name: val } : it))
                      );
                    }}
                    className="flex-1 rounded-lg border border-navy-200 px-2.5 py-1.5 dark:border-white/15 dark:bg-navy-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={item.dosage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedReqItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, dosage: val } : it))
                      );
                    }}
                    placeholder="Dosage"
                    className="w-24 rounded-lg border border-navy-200 px-2.5 py-1.5 dark:border-white/15 dark:bg-navy-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setSelectedReqItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                      );
                    }}
                    placeholder="Qty"
                    className="w-20 rounded-lg border border-navy-200 px-2.5 py-1.5 dark:border-white/15 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Purpose of Request</label>
            <textarea
              rows={2}
              value={reqForm.purpose}
              onChange={(e) => setReqForm({ ...reqForm, purpose: e.target.value })}
              className="w-full rounded-xl border border-navy-200 p-2 dark:border-white/15 dark:bg-navy-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Request Remarks</label>
            <textarea
              rows={2}
              value={reqForm.remarks}
              onChange={(e) => setReqForm({ ...reqForm, remarks: e.target.value })}
              className="w-full rounded-xl border border-navy-200 p-2 dark:border-white/15 dark:bg-navy-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}