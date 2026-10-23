export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export type AppointmentReason = "Medicine" | "Free Check-up" | "Vaccination" | string;

export interface Appointment {
  id: string;
  patientName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  contactNumber: string;
  barangay: string;
  purok?: string;
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
  firstName: string;
  lastName: string;
  middleName?: string;
  patientName?: string;
  contactNumber: string;
  barangay: string;
  purok?: string;
  date: string;
  time: string;
  reason: AppointmentReason;
  notes?: string;
  idPhotoUrl?: string;
}

export interface AppointmentRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  patient_name: string;
  contact_number: string;
  barangay: string;
  purok?: string | null;
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