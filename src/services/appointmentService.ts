import { supabase } from "../supabase/supabase";
import type { Appointment } from "../types/appointment";

export interface MedicineItem {
  id: string;
  name: string;
  dosage: string;
  stock_quantity: number;
  unit: string;
}

export interface DispenseItem {
  medicineId: string;
  quantity: number;
  medicineName: string;
}

export const MAX_APPOINTMENT_CAPACITY = 20;

export const CLINIC_20_SLOTS: string[] = [
  "08:00 AM",
  "08:20 AM",
  "08:40 AM",
  "09:00 AM",
  "09:20 AM",
  "09:40 AM",
  "10:00 AM",
  "10:20 AM",
  "10:40 AM",
  "11:00 AM",
  "11:20 AM",
  "11:40 AM",
  "01:00 PM",
  "01:20 PM",
  "01:40 PM",
  "02:00 PM",
  "02:20 PM",
  "02:40 PM",
  "03:00 PM",
  "03:20 PM",
];

function mapRowToAppointment(row: any): Appointment {
  return {
    id: row.id,
    patientName: row.patient_name || row.patientName,
    contactNumber: row.contact_number || row.contactNumber,
    barangay: row.barangay || "Kumintang Ilaya",
    date: row.date,
    time: row.time,
    reason: row.reason,
    notes: row.notes,
    idPhotoUrl: row.id_photo_url || row.idPhotoUrl,
    remarks: row.remarks,
    completionPhotoUrl:
      row.completion_photo_url ||
      row.completionPhotoUrl ||
      undefined,
    status: row.status,
    createdAt: row.created_at || row.createdAt,
  };
}

export const appointmentService = {
  async list(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("appointmentService.list error:", error.message);
      throw error;
    }

    return (data || []).map(mapRowToAppointment);
  },

  async create(payload: {
    patientName: string;
    contactNumber: string;
    barangay: string;
    reason: string;
    notes?: string;
    idPhotoUrl?: string;
  }): Promise<Appointment> {
    const refId = `APT-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          id: refId,
          patient_name: payload.patientName,
          contact_number: payload.contactNumber,
          barangay: payload.barangay,
          reason: payload.reason,
          notes: payload.notes || null,
          id_photo_url: payload.idPhotoUrl || null,
          status: "Pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("appointmentService.create error:", error.message);
      throw error;
    }

    return mapRowToAppointment(data);
  },

  async getDailyIntakeCount(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const { count, error } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("date", today);

    if (error) {
      console.error("appointmentService.getDailyIntakeCount error:", error.message);
      return 0;
    }

    return count || 0;
  },

  async getTakenTimeSlots(date: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("appointments")
      .select("time")
      .eq("date", date)
      .neq("status", "Cancelled");

    if (error) {
      console.error("appointmentService.getTakenTimeSlots error:", error.message);
      return [];
    }

    return (data || []).map((row: any) => row.time).filter(Boolean);
  },

  async uploadIdPhoto(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `philsys_${Date.now()}_${Math.random()       .toString(36)       .substring(2, 9)}.${fileExt}`;
    const filePath = `ids/${fileName}`;

    let bucketName = "appointment-ids";
    let { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      console.error("uploadIdPhoto error:", uploadError.message);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  },

  async uploadCompletionPhoto(fileOrBlob: File | Blob): Promise<string> {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `completion_${timestamp}_${randomStr}.jpg`;
    const filePath = `completions/${fileName}`;
    const bucketName = "appointment-ids";

    const blobToUpload =
      fileOrBlob instanceof Blob
        ? fileOrBlob
        : new Blob([fileOrBlob], { type: "image/jpeg" });

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blobToUpload, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload failed error detail:", uploadError);
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error("Failed to get public URL for completion photo.");
    }

    return publicUrlData.publicUrl;
  },

  async updateScheduleAndStatus(
    id: string,
    payload: { date: string; time: string; status: string }
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .update({
        date: payload.date,
        time: payload.time,
        status: payload.status,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("appointmentService.updateScheduleAndStatus error:", error.message);
      throw error;
    }

    return mapRowToAppointment(data);
  },

  // --- MEDICINE INVENTORY OPERATIONS ---

  async listMedicines(): Promise<MedicineItem[]> {
    const { data, error } = await supabase
      .from("medicines")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("appointmentService.listMedicines error:", error.message);
      return [];
    }

    return data || [];
  },

  async deductMedicineStock(medicineId: string, quantity: number): Promise<void> {
    const { error } = await supabase.rpc("deduct_medicine_stock", {
      p_medicine_id: medicineId,
      p_quantity: quantity,
    });

    if (error) {
      console.error("appointmentService.deductMedicineStock error:", error.message);
      throw new Error(error.message);
    }
  },

  async completeAppointment(
    id: string,
    remarks: string,
    completionPhotoUrl?: string,
    dispenseList?: DispenseItem[]
  ): Promise<void> {
    // 1. Process multiple medicine deductions sequentially
    const validDispenses = (dispenseList || []).filter(
      (item) => item.medicineId && item.quantity > 0
    );

    for (const item of validDispenses) {
      await this.deductMedicineStock(item.medicineId, item.quantity);
    }

    // 2. Format audit logs in remarks for all dispensed items
    let finalRemarks = remarks.trim();
    if (validDispenses.length > 0) {
      const summary = validDispenses
        .map((item) => `${item.quantity}x${item.medicineName}`)
        .join(", ");
      finalRemarks += `\n[Dispensed: ${summary}]`;
    }

    // 3. Mark appointment as completed
    const { error } = await supabase
      .from("appointments")
      .update({
        status: "Completed",
        remarks: finalRemarks,
        completion_photo_url: completionPhotoUrl || null,
      })
      .eq("id", id);

    if (error) {
      console.error("appointmentService.completeAppointment error:", error.message);
      throw error;
    }
  },

  async updateStatus(id: string, status: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("appointmentService.updateStatus error:", error.message);
      throw error;
    }

    return mapRowToAppointment(data);
  },
};

export default appointmentService;