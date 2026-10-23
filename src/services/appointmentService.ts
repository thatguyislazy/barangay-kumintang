import { supabase } from "../supabase/supabase";
import { smsService } from "./smsService";
import { medicineService } from "./medicineService";
import type { Appointment, AppointmentStatus } from "../types/appointment";

export interface MedicineItem {
  id: string;
  name: string;
  category: string;
  dosage?: string;
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

export const CLINIC_TIME_SLOTS: string[] = CLINIC_20_SLOTS;

export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 9999;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) {
    hours = 0;
  } else if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function formatFullName(first?: string, middle?: string, last?: string, fallback?: string): string {
  if (last && first) {
    const m = middle?.trim() ? ` ${middle.trim().charAt(0)}.` : "";
    return `${last.trim()}, ${first.trim()}${m}`;
  }
  return fallback || "Unnamed Patient";
}

function mapRowToAppointment(row: any): Appointment {
  const constructedName = formatFullName(
    row.first_name,
    row.middle_name,
    row.last_name,
    row.patient_name || row.patientName
  );

  return {
    id: row.id,
    patientName: constructedName,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    middleName: row.middle_name || undefined,
    contactNumber: row.contact_number || row.contactNumber,
    barangay: row.purok ? `${row.purok}, ${row.barangay || "Kumintang Ilaya"}` : (row.barangay || "Kumintang Ilaya"),
    purok: row.purok || undefined,
    date: row.date,
    time: row.time,
    reason: row.reason,
    notes: row.notes,
    idPhotoUrl: row.id_photo_url || row.idPhotoUrl,
    remarks: row.remarks,
    completionPhotoUrl: row.completion_photo_url || row.completionPhotoUrl || undefined,
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
    firstName: string;
    lastName: string;
    middleName?: string;
    contactNumber: string;
    barangay: string;
    purok?: string;
    date: string;
    time: string;
    reason: string;
    notes?: string;
    idPhotoUrl?: string;
  }): Promise<Appointment> {
    const refId = `APT-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullName = formatFullName(payload.firstName, payload.middleName, payload.lastName);

    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          id: refId,
          first_name: payload.firstName.trim(),
          last_name: payload.lastName.trim(),
          middle_name: payload.middleName?.trim() || null,
          patient_name: fullName,
          contact_number: payload.contactNumber.trim(),
          barangay: payload.barangay.trim(),
          purok: payload.purok?.trim() || null,
          date: payload.date,
          time: payload.time,
          reason: payload.reason,
          notes: payload.notes?.trim() || null,
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

    void smsService.sendPending(data.id);
    return mapRowToAppointment(data);
  },

  async confirmAppointmentWithSms(
    appointmentId: string,
    targetDate: string,
    targetTime: string
  ): Promise<Appointment> {
    // 1. Update appointment to Confirmed with assigned date/time
    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "Confirmed",
        date: targetDate,
        time: targetTime,
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) {
      console.error("Error confirming appointment:", error.message);
      throw error;
    }

    // 2. Compute accurate chronological queue number based on time slot
    const { data: dayAppointments, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, time")
      .eq("date", targetDate)
      .eq("status", "Confirmed");

    if (fetchErr) {
      console.warn("Could not calculate precise time queue position, defaulting to 1:", fetchErr.message);
    }

    const sortedDayList = (dayAppointments || []).sort(
      (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
    );

    const calculatedIndex = sortedDayList.findIndex((item) => item.id === appointmentId);
    const assignedQueueNumber = calculatedIndex >= 0 ? calculatedIndex + 1 : sortedDayList.length;

    // 3. Dispatch confirmed SMS with synchronized queue number
    void smsService.sendConfirmed(appointmentId, assignedQueueNumber);

    return mapRowToAppointment(data);
  },

  async updateScheduleAndStatus(
    id: string,
    payload: { date: string; time: string; status: string }
  ): Promise<Appointment> {
    if (payload.status === "Confirmed") {
      return this.confirmAppointmentWithSms(id, payload.date, payload.time);
    }

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
    const fileName = `philsys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `ids/${fileName}`;

    const bucketName = "appointment-ids";
    const { error: uploadError } = await supabase.storage
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
      console.error("Storage upload error:", uploadError);
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error("Failed to get public URL for procedure proof photo.");
    }

    return publicUrlData.publicUrl;
  },

  async listMedicines(): Promise<MedicineItem[]> {
    const medicines = await medicineService.list();
    return medicines.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      dosage: m.dosage,
      stock_quantity: m.quantity,
      unit: m.unit,
    }));
  },

  async deductMedicineStock(medicineId: string, quantity: number): Promise<void> {
    await medicineService.deductStock(medicineId, quantity);
  },

  async completeAppointment(
    id: string,
    remarks: string,
    completionPhotoUrl?: string,
    dispenseList?: DispenseItem[]
  ): Promise<void> {
    const validDispenses = (dispenseList || []).filter(
      (item) => item.medicineId && item.quantity > 0
    );

    for (const item of validDispenses) {
      await this.deductMedicineStock(item.medicineId, item.quantity);
    }

    let finalRemarks = remarks.trim();
    if (validDispenses.length > 0) {
      const summary = validDispenses
        .map((item) => `${item.quantity}x ${item.medicineName}`)
        .join(", ");
      finalRemarks += `\n[Dispensed: ${summary}]`;
    }

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

  async updateStatus(id: string, status: AppointmentStatus | string): Promise<Appointment> {
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