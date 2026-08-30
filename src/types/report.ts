export interface AppointmentStat {
  label: string;
  value: number;
}

export interface ReportSummary {
  totalAppointments: number;
  totalPatients: number;
  totalMedicines: number;
  lowStockCount: number;
  appointmentsByStatus: AppointmentStat[];
  appointmentsByMonth: { month: string; count: number }[];
}
