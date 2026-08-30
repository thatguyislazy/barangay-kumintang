import type { Medicine, MedicineFormData, StockStatus } from "../types/medicine";

function computeStatus(quantity: number, expirationDate: string): StockStatus {
  const daysToExpire =
    (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (quantity <= 0) return "Out of Stock";
  if (daysToExpire <= 45 && daysToExpire >= 0) return "Expiring Soon";
  if (quantity <= 20) return "Low Stock";
  return "In Stock";
}

let medicines: Medicine[] = [
  {
    id: "MED-001",
    name: "Paracetamol 500mg",
    category: "Analgesic",
    quantity: 320,
    unit: "tablets",
    expirationDate: "2027-06-01",
    status: "In Stock",
  },
  {
    id: "MED-002",
    name: "Amoxicillin 500mg",
    category: "Antibiotic",
    quantity: 15,
    unit: "capsules",
    expirationDate: "2026-12-15",
    status: "Low Stock",
  },
  {
    id: "MED-003",
    name: "Oral Rehydration Salts",
    category: "Electrolyte",
    quantity: 0,
    unit: "sachets",
    expirationDate: "2026-10-01",
    status: "Out of Stock",
  },
  {
    id: "MED-004",
    name: "Cetirizine 10mg",
    category: "Antihistamine",
    quantity: 80,
    unit: "tablets",
    expirationDate: "2026-10-05",
    status: "Expiring Soon",
  },
  {
    id: "MED-005",
    name: "Multivitamins (Adult)",
    category: "Supplement",
    quantity: 150,
    unit: "tablets",
    expirationDate: "2027-03-20",
    status: "In Stock",
  },
];

medicines = medicines.map((m) => ({ ...m, status: computeStatus(m.quantity, m.expirationDate) }));

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const medicineService = {
  async list(): Promise<Medicine[]> {
    await delay();
    return [...medicines];
  },

  async create(data: MedicineFormData): Promise<Medicine> {
    await delay(700);
    const newMed: Medicine = {
      ...data,
      id: `MED-${String(medicines.length + 1).padStart(3, "0")}`,
      status: computeStatus(data.quantity, data.expirationDate),
    };
    medicines = [newMed, ...medicines];
    return newMed;
  },

  async update(id: string, data: Partial<MedicineFormData>): Promise<Medicine> {
    await delay(500);
    medicines = medicines.map((m) => {
      if (m.id !== id) return m;
      const merged = { ...m, ...data };
      return { ...merged, status: computeStatus(merged.quantity, merged.expirationDate) };
    });
    const updated = medicines.find((m) => m.id === id);
    if (!updated) throw new Error("Medicine not found");
    return updated;
  },

  async remove(id: string): Promise<void> {
    await delay(400);
    medicines = medicines.filter((m) => m.id !== id);
  },

  async adjustStock(id: string, delta: number): Promise<Medicine> {
    await delay(300);
    medicines = medicines.map((m) => {
      if (m.id !== id) return m;
      const quantity = Math.max(0, m.quantity + delta);
      return { ...m, quantity, status: computeStatus(quantity, m.expirationDate) };
    });
    const updated = medicines.find((m) => m.id === id);
    if (!updated) throw new Error("Medicine not found");
    return updated;
  },
};
