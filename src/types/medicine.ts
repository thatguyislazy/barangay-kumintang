export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Expiring Soon";

export interface Medicine {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  status: StockStatus;
}

export interface MedicineFormData {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate: string;
}
