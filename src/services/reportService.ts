import { appointmentService } from "./appointmentService";
import { patientService } from "./patientService";
import { medicineService } from "./medicineService";
import type { ReportSummary } from "../types/report";

export const reportService = {
  async summary(): Promise<ReportSummary> {
    const [appointments, patients, medicines] = await Promise.all([
      appointmentService.list(),
      patientService.list(),
      medicineService.list(),
    ]);

    const byStatus = ["Pending", "Confirmed", "Completed", "Cancelled"].map((label) => ({
      label,
      value: appointments.filter((a) => a.status === label).length,
    }));

    const monthMap = new Map<string, number>();
    appointments.forEach((a) => {
      const month = new Date(a.date).toLocaleString("en-US", { month: "short" });
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    });

    return {
      totalAppointments: appointments.length,
      totalPatients: patients.filter((p) => p.status === "Active").length,
      totalMedicines: medicines.length,
      lowStockCount: medicines.filter(
        (m) => m.status === "Low Stock" || m.status === "Out of Stock"
      ).length,
      appointmentsByStatus: byStatus,
      appointmentsByMonth: Array.from(monthMap.entries()).map(([month, count]) => ({
        month,
        count,
      })),
    };
  },
};
