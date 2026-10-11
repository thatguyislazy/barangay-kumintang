import { supabase } from "../supabase/supabase";
import type {
  Appointment,
  AppointmentFormData,
  AppointmentRow,
  AppointmentStatus,
} from "../types/appointment";

export const MAX_APPOINTMENT_CAPACITY = 20;

// Exactly 20 distinct 20-minute slots between 8:00 AM and 5:00 PM
export const CLINIC_20_SLOTS = [
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
  "01:00 PM",
  "01:20 PM",
  "01:40 PM",
  "02:00 PM",
  "02:20 PM",
  "02:40 PM",
  "03:00 PM",
  "03:20 PM",
  "03:40 PM",
  "04:00 PM",
];

function mapRowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientName: row.patient_name,
    contactNumber: row.contact_number,
    barangay: row.barangay,
    date: row.date ?? undefined,
    time: row.time ?? undefined,
    reason: row.reason,
    notes: row.notes ?? undefined,
    idPhotoUrl: row.id_photo_url ?? undefined,
    remarks: row.remarks ?? undefined,
    completionPhotoUrl: row.completion_photo_url ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const appointmentService = {
  // Counts active intake requests for today (Pending or Confirmed)
  async getDailyIntakeCount(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const { count, error } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`)
      .neq("status", "Cancelled");

    if (error) {
      console.error("Error fetching intake count:", error.message);
      return 0;
    }

    return count || 0;
  },

  // Count confirmed bookings for a specific scheduled date (excludes cancelled)
  async getSlotCount(date: string): Promise<number> {
    const { count, error } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("date", date)
      .neq("status", "Cancelled");

    if (error) {
      console.error("Error fetching slot count:", error.message);
      return 0;
    }

    return count || 0;
  },

  // Get already occupied time slots for a specific date
  async getTakenTimeSlots(date: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("appointments")
      .select("time")
      .eq("date", date)
      .neq("status", "Cancelled");

    if (error || !data) {
      return [];
    }

    return data.map((d) => d.time).filter(Boolean) as string[];
  },

  async uploadIdPhoto(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `residence-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("id-verifications")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("id-verifications")
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Upload proof of consultation / camera picture taken by nurse
  async uploadCompletionPhoto(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `served/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("consultation-proofs")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Proof storage upload error:", uploadError.message);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("consultation-proofs")
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async list(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching appointments:", error.message);
      throw error;
    }

    return (data as AppointmentRow[]).map(mapRowToAppointment);
  },

  async create(formData: AppointmentFormData): Promise<Appointment> {
    const intakeCount = await this.getDailyIntakeCount();
    if (intakeCount >= MAX_APPOINTMENT_CAPACITY) {
      throw new Error(`Daily booking quota reached (${MAX_APPOINTMENT_CAPACITY} appointments maximum). Please check back tomorrow.`);
    }

    const customId = `APT-${Date.now().toString().slice(-4)}`;

    const payload = {
      id: customId,
      patient_name: formData.patientName,
      contact_number: formData.contactNumber,
      barangay: formData.barangay,
      date: null,
      time: null,
      reason: formData.reason,
      notes: formData.notes || null,
      id_photo_url: formData.idPhotoUrl || null,
      remarks: null,
      completion_photo_url: null,
      status: "Pending" as AppointmentStatus,
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error creating appointment:", error.message);
      throw error;
    }

    return mapRowToAppointment(data as AppointmentRow);
  },

  async updateScheduleAndStatus(
    id: string,
    params: { date?: string; time?: string; status: AppointmentStatus }
  ): Promise<Appointment> {
    if (params.date && params.status === "Confirmed") {
      const slots = await this.getSlotCount(params.date);
      if (slots >= MAX_APPOINTMENT_CAPACITY) {
        throw new Error(`This date has reached the maximum capacity (${MAX_APPOINTMENT_CAPACITY} slots).`);
      }
    }

    const payload: Partial<AppointmentRow> = {
      status: params.status,
      ...(params.date !== undefined && { date: params.date }),
      ...(params.time !== undefined && { time: params.time }),
    };

    const { data, error } = await supabase
      .from("appointments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating appointment schedule:", error.message);
      throw error;
    }

    return mapRowToAppointment(data as AppointmentRow);
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating status:", error.message);
      throw error;
    }

    return mapRowToAppointment(data as AppointmentRow);
  },

  // Nurse completes consultation with remarks and optional photo proof
  async completeAppointment(
    id: string,
    remarks: string,
    completionPhotoUrl?: string
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "Completed",
        remarks: remarks || null,
        completion_photo_url: completionPhotoUrl || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error completing appointment:", error.message);
      throw error;
    }

    return mapRowToAppointment(data as AppointmentRow);
  },
};