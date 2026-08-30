import type { Patient } from "../types/patient";

let patients: Patient[] = [
  {
    id: "PAT-001",
    fullName: "Maria Santos",
    contactNumber: "0917 234 5678",
    address: "Purok 3, Kumintang Ilaya",
    birthDate: "1988-04-12",
    sex: "Female",
    status: "Active",
    lastVisit: "2026-08-15",
    appointmentHistory: [
      { id: "APT-0990", date: "2026-08-15", reason: "General checkup", status: "Completed" },
    ],
  },
  {
    id: "PAT-002",
    fullName: "Jose Dimaculangan",
    contactNumber: "0928 555 1122",
    address: "Purok 5, Kumintang Ilaya",
    birthDate: "1975-11-02",
    sex: "Male",
    status: "Active",
    lastVisit: "2026-07-30",
    appointmentHistory: [
      { id: "APT-0955", date: "2026-07-30", reason: "Vaccination", status: "Completed" },
    ],
  },
  {
    id: "PAT-003",
    fullName: "Angelica Reyes",
    contactNumber: "0906 812 4490",
    address: "Purok 1, Kumintang Ilaya",
    birthDate: "1996-02-19",
    sex: "Female",
    status: "Active",
    lastVisit: "2026-08-29",
    appointmentHistory: [
      { id: "APT-1003", date: "2026-08-29", reason: "Prenatal consultation", status: "Completed" },
    ],
  },
  {
    id: "PAT-004",
    fullName: "Ramon Villareal",
    contactNumber: "0933 720 6651",
    address: "Purok 7, Kumintang Ilaya",
    birthDate: "1960-06-25",
    sex: "Male",
    status: "Archived",
    lastVisit: "2026-05-10",
    appointmentHistory: [],
  },
];

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const patientService = {
  async list(): Promise<Patient[]> {
    await delay();
    return [...patients];
  },

  async get(id: string): Promise<Patient | undefined> {
    await delay(200);
    return patients.find((p) => p.id === id);
  },

  async create(data: Omit<Patient, "id" | "appointmentHistory" | "status">): Promise<Patient> {
    await delay(700);
    const newPatient: Patient = {
      ...data,
      id: `PAT-${String(patients.length + 1).padStart(3, "0")}`,
      status: "Active",
      appointmentHistory: [],
    };
    patients = [newPatient, ...patients];
    return newPatient;
  },

  async update(id: string, data: Partial<Patient>): Promise<Patient> {
    await delay(500);
    patients = patients.map((p) => (p.id === id ? { ...p, ...data } : p));
    const updated = patients.find((p) => p.id === id);
    if (!updated) throw new Error("Patient not found");
    return updated;
  },

  async archive(id: string): Promise<void> {
    await delay(400);
    patients = patients.map((p) => (p.id === id ? { ...p, status: "Archived" } : p));
  },
};
