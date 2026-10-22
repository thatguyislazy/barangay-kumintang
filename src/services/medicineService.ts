import { supabase } from "../supabase/supabase";
import type { Medicine, MedicineFormData, StockStatus } from "../types/medicine";

export function computeStatus(quantity: number, expirationDate: string): StockStatus {
  const daysToExpire =
    (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (quantity <= 0) return "Out of Stock";
  if (daysToExpire <= 45 && daysToExpire >= 0) return "Expiring Soon";
  if (quantity <= 20) return "Low Stock";
  return "In Stock";
}

function mapRowToMedicine(row: any): Medicine {
  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    quantity: Number(row.quantity ?? row.stock_quantity ?? 0),
    unit: row.unit || "pcs",
    expirationDate: row.expiration_date,
    status: row.status,
  };
}

export const medicineService = {
  async list(): Promise<Medicine[]> {
    const { data, error } = await supabase
      .from("medicines")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching medicines:", error.message);
      throw error;
    }

    return (data || []).map(mapRowToMedicine);
  },

  async create(data: MedicineFormData): Promise<Medicine> {
    const id = `MED-${Date.now().toString().slice(-4)}`;
    const status = computeStatus(data.quantity, data.expirationDate);

    const payload = {
      id,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      expiration_date: data.expirationDate,
      status,
    };

    const { data: inserted, error } = await supabase
      .from("medicines")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error creating medicine:", error.message);
      throw error;
    }

    return mapRowToMedicine(inserted);
  },

  async update(id: string, data: Partial<MedicineFormData>): Promise<Medicine> {
    const { data: current, error: fetchErr } = await supabase
      .from("medicines")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !current) {
      throw new Error("Medicine not found");
    }

    const currentQty = Number(current.quantity ?? current.stock_quantity ?? 0);
    const nextQuantity = data.quantity !== undefined ? data.quantity : currentQty;
    const nextExpDate = data.expirationDate !== undefined ? data.expirationDate : current.expiration_date;
    const nextStatus = computeStatus(nextQuantity, nextExpDate);

    const payload: Record<string, any> = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.quantity !== undefined && { quantity: data.quantity }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.expirationDate !== undefined && { expiration_date: data.expirationDate }),
      status: nextStatus,
    };

    const { data: updated, error } = await supabase
      .from("medicines")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating medicine:", error.message);
      throw error;
    }

    return mapRowToMedicine(updated);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("medicines")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting medicine:", error.message);
      throw error;
    }
  },

  async adjustStock(id: string, delta: number): Promise<Medicine> {
    const { data: current, error: fetchErr } = await supabase
      .from("medicines")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !current) {
      throw new Error("Medicine not found");
    }

    const currentQty = Number(current.quantity ?? current.stock_quantity ?? 0);
    const nextQuantity = Math.max(0, currentQty + delta);
    const nextStatus = computeStatus(nextQuantity, current.expiration_date);

    const { data: updated, error } = await supabase
      .from("medicines")
      .update({ quantity: nextQuantity, status: nextStatus })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error adjusting stock:", error.message);
      throw error;
    }

    return mapRowToMedicine(updated);
  },
};