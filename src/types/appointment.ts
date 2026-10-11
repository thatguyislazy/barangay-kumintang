export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export type AppointmentReason = "Medicine" | "Free Check-up" | "Vaccination";

export interface Appointment {
  id: string;
  patientName: string;
  contactNumber: string;
  barangay: string;
  date?: string;
  time?: string;
  reason: string;
  notes?: string;
  idPhotoUrl?: string;
  remarks?: string;
  completionPhotoUrl?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface AppointmentFormData {
  patientName: string;
  contactNumber: string;
  barangay: string;
  reason: AppointmentReason | "";
  notes?: string;
  idPhotoUrl?: string;
}

export interface AppointmentRow {
  id: string;
  patient_name: string;
  contact_number: string;
  barangay: string;
  date: string | null;
  time: string | null;
  reason: string;
  notes: string | null;
  id_photo_url: string | null;
  remarks: string | null;
  completion_photo_url: string | null;
  status: AppointmentStatus;
  created_at: string;
}