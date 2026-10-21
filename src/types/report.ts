export interface AppointmentStat {
  label: string;
  value: number;
}

export interface ServiceBreakdownStat {
  service: string;
  count: number;
  percentage: number;
}

export interface BarangayReachStat {
  barangay: string;
  count: number;
}

export interface MedicineStockSummary {
  id: string;
  name: string;
  dosage: string;
  stock_quantity: number;
  unit: string;
  status: "Available" | "Low Stock" | "Out of Stock";
}

export interface ReportSummary {
  totalAppointments: number;
  completedConsultations: number;
  totalPatients: number;
  totalMedicines: number;
  lowStockCount: number;
  serviceBreakdown: ServiceBreakdownStat[];
  barangayReach: BarangayReachStat[];
  appointmentsByStatus: AppointmentStat[];
  appointmentsByMonth: { month: string; count: number }[];
  medicinesInventory: MedicineStockSummary[];
}