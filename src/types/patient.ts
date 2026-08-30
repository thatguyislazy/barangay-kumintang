export interface Patient {
  id: string;
  fullName: string;
  contactNumber: string;
  address: string;
  birthDate: string;
  sex: "Male" | "Female";
  status: "Active" | "Archived";
  lastVisit?: string;
  appointmentHistory: PatientAppointmentRecord[];
}

export interface PatientAppointmentRecord {
  id: string;
  date: string;
  reason: string;
  status: string;
}
