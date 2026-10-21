import { appointmentService } from "./appointmentService";
import { patientService } from "./patientService";
import { medicineService } from "./medicineService";
import type { ReportSummary, ServiceBreakdownStat, BarangayReachStat, MedicineStockSummary } from "../types/report";

export const reportService = {
  async summary(): Promise<ReportSummary> {
    const [appointments, patients, medicines] = await Promise.all([
      appointmentService.list(),
      patientService.list(),
      medicineService.list(),
    ]);

    // 1. Status Breakdown
    const byStatus = ["Completed", "Confirmed", "Pending", "Cancelled"].map((label) => ({
      label,
      value: appointments.filter((a) => a.status === label).length,
    }));

    // 2. Service Utilization (Free Check-up, Medicine, Vaccination, etc.)
    const serviceCounts: Record<string, number> = {
      "Free Check-up": 0,
      "Medicine": 0,
      "Vaccination": 0,
      "Other Consultations": 0,
    };

    appointments.forEach((a) => {
      const reason = (a.reason || "").toLowerCase();
      if (reason.includes("medicin") || reason.includes("gamot") || reason.includes("pharmac")) {
        serviceCounts["Medicine"]++;
      } else if (reason.includes("vaccin") || reason.includes("bakuna") || reason.includes("immuniz")) {
        serviceCounts["Vaccination"]++;
      } else if (reason.includes("check") || reason.includes("consult")) {
        serviceCounts["Free Check-up"]++;
      } else {
        serviceCounts["Other Consultations"]++;
      }
    });

    const totalApts = appointments.length || 1;
    const serviceBreakdown: ServiceBreakdownStat[] = Object.entries(serviceCounts).map(
      ([service, count]) => ({
        service,
        count,
        percentage: Math.round((count / totalApts) * 100),
      })
    );

    // 3. Community Reach by Barangay
    const barangayMap = new Map<string, number>();
    appointments.forEach((a) => {
      const bgy = (a.barangay || "Kumintang Ilaya").trim();
      barangayMap.set(bgy, (barangayMap.get(bgy) ?? 0) + 1);
    });

    const barangayReach: BarangayReachStat[] = Array.from(barangayMap.entries())
      .map(([barangay, count]) => ({ barangay, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Monthly Trend
    const monthMap = new Map<string, number>();
    appointments.forEach((a) => {
      const dateVal = a.date ? new Date(a.date) : new Date(a.createdAt);
      const month = dateVal.toLocaleString("en-US", { month: "short" });
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    });

    // 5. Medicine Stock Status
    const medicinesInventory: MedicineStockSummary[] = (medicines || []).map((m: any) => {
      const qty = Number(m.stock_quantity ?? m.stock ?? 0);
      let status: "Available" | "Low Stock" | "Out of Stock" = "Available";
      if (qty <= 0) status = "Out of Stock";
      else if (qty <= 20) status = "Low Stock";

      return {
        id: m.id,
        name: m.name,
        dosage: m.dosage || "",
        stock_quantity: qty,
        unit: m.unit || "pcs",
        status,
      };
    });

    const lowStockCount = medicinesInventory.filter(
      (m) => m.status === "Low Stock" || m.status === "Out of Stock"
    ).length;

    const completedConsultations = appointments.filter((a) => a.status === "Completed").length;

    return {
      totalAppointments: appointments.length,
      completedConsultations,
      totalPatients: patients.length,
      totalMedicines: medicines.length,
      lowStockCount,
      serviceBreakdown,
      barangayReach,
      appointmentsByStatus: byStatus,
      appointmentsByMonth: Array.from(monthMap.entries()).map(([month, count]) => ({
        month,
        count,
      })),
      medicinesInventory,
    }; 
  },
};