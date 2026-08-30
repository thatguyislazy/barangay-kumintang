import type { Appointment, AppointmentFormData, AppointmentStatus } from "../types/appointment";

// Mock/local data store. Swap the internals of these functions for real
// API / Supabase / Firebase calls later without touching consuming pages.
let appointments: Appointment[] = [
  {
    id: "APT-1001",
    patientName: "Maria Santos",
    contactNumber: "0917 234 5678",
    barangay: "Kumintang Ilaya",
    date: "2026-09-02",
    time: "09:00 AM",
    reason: "General checkup",
    status: "Confirmed",
    createdAt: "2026-08-25T09:12:00Z",
  },
  {
    id: "APT-1002",
    patientName: "Jose Dimaculangan",
    contactNumber: "0928 555 1122",
    barangay: "Kumintang Ilaya",
    date: "2026-09-02",
    time: "10:30 AM",
    reason: "Vaccination follow-up",
    status: "Pending",
    createdAt: "2026-08-27T14:03:00Z",
  },
  {
    id: "APT-1003",
    patientName: "Angelica Reyes",
    contactNumber: "0906 812 4490",
    barangay: "Kumintang Ilaya",
    date: "2026-08-29",
    time: "01:00 PM",
    reason: "Prenatal consultation",
    status: "Completed",
    createdAt: "2026-08-20T08:40:00Z",
  },
  {
    id: "APT-1004",
    patientName: "Ramon Villareal",
    contactNumber: "0933 720 6651",
    barangay: "Kumintang Ilaya",
    date: "2026-08-31",
    time: "03:30 PM",
    reason: "Blood pressure monitoring",
    status: "Cancelled",
    createdAt: "2026-08-22T11:20:00Z",
  },
  {
    id: "APT-1005",
    patientName: "Carmela Aquino",
    contactNumber: "0945 112 8890",
    barangay: "Kumintang Ilaya",
    date: "2026-09-03",
    time: "08:30 AM",
    reason: "Child immunization",
    status: "Confirmed",
    createdAt: "2026-08-26T10:00:00Z",
  },
];

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId() {
  const nextNum = 1000 + appointments.length + 1;
  return `APT-${nextNum}`;
}

export const appointmentService = {
  async list(): Promise<Appointment[]> {
    await delay();
    return [...appointments].sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  async create(data: AppointmentFormData): Promise<Appointment> {
    await delay(900);
    const newAppointment: Appointment = {
      id: generateId(),
      ...data,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    appointments = [newAppointment, ...appointments];
    return newAppointment;
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    await delay(400);
    appointments = appointments.map((appt) =>
      appt.id === id ? { ...appt, status } : appt
    );
    const updated = appointments.find((a) => a.id === id);
    if (!updated) throw new Error("Appointment not found");
    return updated;
  },

  async stats() {
    await delay(200);
    const today = new Date().toISOString().slice(0, 10);
    const todays = appointments.filter((a) => a.date === today);
    return {
      total: todays.length,
      pending: appointments.filter((a) => a.status === "Pending").length,
      confirmed: appointments.filter((a) => a.status === "Confirmed").length,
      completed: appointments.filter((a) => a.status === "Completed").length,
    };
  },
};
