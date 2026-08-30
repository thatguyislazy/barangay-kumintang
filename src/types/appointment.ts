export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export interface Appointment {
  id: string;
  patientName: string;
  contactNumber: string;
  barangay: string;
  date: string;
  time: string;
  reason: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface AppointmentFormData {
  patientName: string;
  contactNumber: string;
  barangay: string;
  date: string;
  time: string;
  reason: string;
  notes?: string;
}
