import { useEffect, useState, useMemo } from "react";
import {
  Printer,
  CalendarRange,
  Users,
  Pill,
  CheckCircle2,
  Stethoscope,
  Syringe,
  MapPin,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { reportService } from "../../services/reportService";
import { appointmentService } from "../../services/appointmentService";
import { medicineService } from "../../services/medicineService";
import type { ReportSummary } from "../../types/report";
import type { Appointment } from "../../types/appointment";

export default function Reports() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [range, setRange] = useState<string>("all-time");

  async function loadData() {
    setLoading(true);
    const [sum, apts, meds] = await Promise.all([
      reportService.summary(),
      appointmentService.list(),
      medicineService.list(),
    ]);
    setSummary(sum);
    setAppointments(apts);
    setMedicines(meds);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const maxMonth = summary
    ? Math.max(...summary.appointmentsByMonth.map((m) => m.count), 1)
    : 1;

  // Compute LGU & DOH Metrics
  const metrics = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === "Completed").length;
    const pending = appointments.filter((a) => a.status === "Pending" || a.status === "Confirmed").length;
    const cancelled = appointments.filter((a) => a.status === "Cancelled").length;

    const checkupCount = appointments.filter((a) => {
      const r = (a.reason || "").toLowerCase();
      return r.includes("check") || r.includes("consult");
    }).length;

    const medicineCount = appointments.filter((a) => {
      const r = (a.reason || "").toLowerCase();
      return r.includes("medicin") || r.includes("gamot") || r.includes("pharmac");
    }).length;

    const vaccineCount = appointments.filter((a) => {
      const r = (a.reason || "").toLowerCase();
      return r.includes("vaccin") || r.includes("bakuna") || r.includes("immuniz");
    }).length;

    return {
      total,
      completed,
      pending,
      cancelled,
      checkupCount,
      medicineCount,
      vaccineCount,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0",
    };
  }, [appointments]);

  const completedTransactions = useMemo(() => {
    return appointments.filter((a) => a.status === "Completed");
  }, [appointments]);

  return (
    <AdminLayout
      title="Clinic Executive Reports"
      description="Operational statistics and formal municipal reporting."
    >
      {/* 
        CALIBRI-BASED FORMAL REPORT STYLESHEET
      */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm 16mm 14mm 16mm;
          }
          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            font-family: Calibri, 'Segoe UI', Candara, Carlito, Arial, sans-serif !important;
            font-size: 10.5pt !important;
            line-height: 1.4 !important;
          }
          /* Hide all application dashboard elements */
          header, nav, aside, .screen-controls, .screen-dashboard {
            display: none !important;
          }
          /* Show pure document container */
          .document-report {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Calibri, 'Segoe UI', Candara, Carlito, Arial, sans-serif !important;
          }
          .doc-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 0.9rem !important;
            font-family: Calibri, 'Segoe UI', Candara, Carlito, Arial, sans-serif !important;
          }
          .doc-table th, .doc-table td {
            border: 1px solid #1f2937 !important;
            padding: 4.5px 7px !important;
            font-size: 9pt !important;
            color: #111827 !important;
            vertical-align: middle !important;
          }
          .doc-table th {
            background-color: #f3f4f6 !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.03em !important;
            font-size: 8.5pt !important;
          }
          .page-break {
            page-break-before: always !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        @media screen {
          .document-report {
            display: none;
          }
        }
      `}</style>

      {/* =========================================================================
          1. INTERACTIVE SCREEN UI (Modern Web Dashboard for Clinic Staff)
         ========================================================================= */}
      <div className="screen-dashboard space-y-6">
        <div className="screen-controls flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy-800 shadow-sm dark:border-white/10 dark:bg-navy-900 dark:text-white">
            <CalendarRange className="h-4 w-4 text-blue-600" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              <option value="all-time">All Recorded Data</option>
              <option value="this-month">This Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="this-year">This Year</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3.5 py-2 text-xs font-bold text-navy-800 shadow-sm hover:bg-navy-50 dark:border-white/10 dark:bg-navy-900 dark:text-white cursor-pointer active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lift hover:bg-blue-500 cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4" />
              Generate Official LGU Accomplishment Report
            </button>
          </div>
        </div>

        {loading || !summary ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white dark:bg-navy-900" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-navy-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-white/60">
                    Total Consultations
                  </span>
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-extrabold text-navy-900 dark:text-white">
                  {summary.totalAppointments}
                </p>
                <p className="mt-1 text-xs text-ink-500 dark:text-white/50">
                  Total patient bookings received
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-950/30 dark:bg-emerald-950/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Completed & Served
                  </span>
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-extrabold text-emerald-900 dark:text-emerald-200">
                  {summary.completedConsultations}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400/80">
                  Finished procedures with photo proof
                </p>
              </div>

              <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-navy-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-white/60">
                    Registered Patients
                  </span>
                  <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-extrabold text-navy-900 dark:text-white">
                  {summary.totalPatients}
                </p>
                <p className="mt-1 text-xs text-ink-500 dark:text-white/50">
                  Individual residents on record
                </p>
              </div>

              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  summary.lowStockCount > 0
                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/10"
                    : "border-navy-100 bg-white dark:border-white/10 dark:bg-navy-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      summary.lowStockCount > 0
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-ink-500 dark:text-white/60"
                    }`}
                  >
                    Inventory Alerts
                  </span>
                  <div
                    className={`rounded-xl p-2 ${
                      summary.lowStockCount > 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-white"
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-extrabold text-navy-900 dark:text-white">
                  {summary.lowStockCount}
                </p>
                <p className="mt-1 text-xs text-ink-500 dark:text-white/50">
                  {summary.lowStockCount > 0
                    ? "Medicines need restocking"
                    : "All pharmacy items healthy"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-navy-900">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                    Services Availed by Residents
                  </h2>
                  <span className="text-xs text-ink-400 dark:text-white/40">Relative share</span>
                </div>

                <div className="space-y-4">
                  {summary.serviceBreakdown.map((item) => {
                    const getIcon = () => {
                      if (item.service === "Medicine") return <Pill className="h-4 w-4 text-blue-500" />;
                      if (item.service === "Vaccination") return <Syringe className="h-4 w-4 text-emerald-500" />;
                      return <Stethoscope className="h-4 w-4 text-amber-500" />;
                    };

                    return (
                      <div key={item.service} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-bold text-navy-900 dark:text-white">
                            {getIcon()}
                            {item.service}
                          </span>
                          <span className="font-semibold text-ink-500 dark:text-white/70">
                            {item.count} patients ({item.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-navy-100/60 dark:bg-white/10">
                          <div
                            className={`h-full rounded-full ${
                              item.service === "Medicine"
                                ? "bg-blue-600"
                                : item.service === "Vaccination"
                                ? "bg-emerald-600"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-navy-900">
                <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                  Monthly Patient Flow
                </h2>
                <p className="mt-1 text-xs text-ink-500 dark:text-white/50">
                  Appointments volume across calendar months
                </p>

                <div className="mt-6 flex h-48 items-end gap-3">
                  {summary.appointmentsByMonth.length === 0 ? (
                    <p className="text-xs text-ink-400">No monthly trends recorded yet.</p>
                  ) : (
                    summary.appointmentsByMonth.map((m) => (
                      <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                        <div className="text-[11px] font-bold text-navy-800 dark:text-white">
                          {m.count}
                        </div>
                        <div className="flex h-36 w-full items-end">
                          <div
                            className="w-full rounded-t-xl bg-blue-600 hover:bg-blue-500 transition-all"
                            style={{ height: `${Math.max((m.count / maxMonth) * 100, 10)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-ink-500 dark:text-white/60">
                          {m.month}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-navy-900">
                <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                  Barangay & Community Outreach
                </h2>
                <p className="mt-1 text-xs text-ink-500 dark:text-white/50">
                  Where consultations originate from
                </p>

                <div className="mt-4 divide-y divide-navy-100 dark:divide-white/10">
                  {summary.barangayReach.map((b) => (
                    <div key={b.barangay} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span className="text-xs font-bold text-navy-900 dark:text-white">
                          {b.barangay}
                        </span>
                      </div>
                      <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-extrabold text-navy-800 dark:bg-white/10 dark:text-white">
                        {b.count} resident(s)
                      </span>
                    </div>
                  ))}
                  {summary.barangayReach.length === 0 && (
                    <p className="py-4 text-xs text-ink-400">No barangay data recorded yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-navy-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-base font-bold text-navy-900 dark:text-white">
                      Pharmacy Stock Health
                    </h2>
                    <p className="mt-1 text-xs text-ink-500 dark:text-white/50">
                      Real-time inventory levels
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {summary.totalMedicines} Products
                  </span>
                </div>

                <div className="mt-4 max-h-56 overflow-y-auto space-y-2 pr-1">
                  {summary.medicinesInventory.map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between rounded-xl border border-navy-100/70 p-2.5 text-xs dark:border-white/10"
                    >
                      <div>
                        <div className="font-bold text-navy-900 dark:text-white">
                          {med.name}
                        </div>
                        <div className="text-[11px] text-ink-400 dark:text-white/50">
                          {med.dosage || "Standard"}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            med.status === "Out of Stock"
                              ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                              : med.status === "Low Stock"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          }`}
                        >
                          {med.stock_quantity} {med.unit} ({med.status})
                        </span>
                      </div>
                    </div>
                  ))}
                  {summary.medicinesInventory.length === 0 && (
                    <p className="text-xs text-ink-400">No medicine items found.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          2. PRINT & PDF DOCUMENT FORMAT (Formal Calibri Typography)
         ========================================================================= */}
      <div className="document-report" style={{ fontFamily: "Calibri, 'Segoe UI', Candara, Carlito, Arial, sans-serif" }}>
        {/* LGU Official Letterhead */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #111827", paddingBottom: "10px", marginBottom: "14px", position: "relative" }}>
          <img
            src="/favicon.png"
            alt="Official Seal"
            style={{ position: "absolute", left: "0", top: "2px", width: "72px", height: "72px", objectFit: "contain" }}
          />
          <div style={{ paddingLeft: "80px", paddingRight: "80px" }}>
            <p style={{ margin: "0", fontSize: "9.5pt", textTransform: "uppercase", letterSpacing: "1.2px", color: "#4b5563" }}>
              Republic of the Philippines
            </p>
            <p style={{ margin: "0", fontSize: "10pt", fontWeight: "bold", textTransform: "uppercase", color: "#1f2937" }}>
              Province of Batangas • City Government of Batangas
            </p>
            <h1 style={{ margin: "3px 0 2px 0", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", color: "#111827", letterSpacing: "0.5px" }}>
              Barangay Kumintang Ilaya Health Center
            </h1>
            <p style={{ margin: "0", fontSize: "9pt", color: "#4b5563" }}>
              Primary Healthcare Delivery & Public Medical Assistance Office
            </p>
          </div>
        </div>

        {/* Document Metadata Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5pt", borderBottom: "1px solid #9ca3af", paddingBottom: "6px", marginBottom: "14px", color: "#1f2937" }}>
          <div>
            <strong>DOCUMENT:</strong> OFFICIAL HEALTHCARE ACCOMPLISHMENT & DISPENSATION LEDGER<br />
            <strong>REPORTING PERIOD:</strong> CUMULATIVE TO DATE ({new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })})
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>CONTROL NO:</strong> BKI-CHO-{(new Date()).getFullYear()}-{Date.now().toString().slice(-5)}<br />
            <strong>CLASSIFICATION:</strong> PUBLIC HEALTHCARE & CIVIC AUDIT ARCHIVE
          </div>
        </div>

        {/* Section 1: Executive Narrative */}
        <div className="avoid-break" style={{ marginBottom: "14px", textAlign: "justify", fontSize: "9.5pt", color: "#1f2937" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "9pt", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db", marginBottom: "6px", paddingBottom: "2px", color: "#111827" }}>
            I. Executive Summary & Administrative Mandate
          </div>
          <p style={{ margin: "0 0 6px 0", textIndent: "20px" }}>
            In accordance with Republic Act No. 7160 (Local Government Code) and the Universal Health Care Act (RA 11223), this document records the verified primary clinical evaluations, routine preventive health interventions, and pharmaceutical allocations provided by the Barangay Kumintang Ilaya Health Center. All consultations and medical issuances documented herein are registered through our validated community triage records.
          </p>
          <p style={{ margin: "0", textIndent: "20px" }}>
            During the covered administrative cycle, a cumulative total of <strong>{metrics.total} citizen appointments</strong> were handled by the primary care desk, achieving an overall verified service completion rate of <strong>{metrics.completionRate}%</strong>. All services, diagnostic triage, and prescribed pharmaceutical items were granted as free public assistance to residents.
          </p>
        </div>

        {/* Section 2: Primary Health Programs Accomplishment Matrix */}
        <div className="avoid-break" style={{ marginBottom: "14px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "9pt", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db", marginBottom: "6px", paddingBottom: "2px", color: "#111827" }}>
            II. Primary Healthcare Caseload & Accomplishment Matrix
          </div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Health Service Category</th>
                <th style={{ width: "42%" }}>Clinical Scope / Target Description</th>
                <th style={{ width: "14%", textAlign: "center" }}>Patients Served</th>
                <th style={{ width: "14%", textAlign: "center" }}>Program Share</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>General Medical Check-up</strong></td>
                <td>Routine diagnostic evaluations, vitals assessment, and primary physician consult</td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>{metrics.checkupCount}</td>
                <td style={{ textAlign: "center" }}>{metrics.total > 0 ? ((metrics.checkupCount / metrics.total) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td><strong>Free Medicine Dispensation</strong></td>
                <td>Issuance of prescription antibiotics, analgesics, antipyretics, and maintenance items</td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>{metrics.medicineCount}</td>
                <td style={{ textAlign: "center" }}>{metrics.total > 0 ? ((metrics.medicineCount / metrics.total) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td><strong>Vaccination & Immunization</strong></td>
                <td>Childhood routine vaccinations and community preventive immunization drives</td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>{metrics.vaccineCount}</td>
                <td style={{ textAlign: "center" }}>{metrics.total > 0 ? ((metrics.vaccineCount / metrics.total) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr style={{ backgroundColor: "#f9fafb", fontWeight: "bold" }}>
                <td colSpan={2}>TOTAL VERIFIED HEALTHCARE TRANSACTIONS</td>
                <td style={{ textAlign: "center" }}>{metrics.completed}</td>
                <td style={{ textAlign: "center" }}>100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Demographic Outreach */}
        <div className="avoid-break" style={{ marginBottom: "14px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "9pt", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db", marginBottom: "6px", paddingBottom: "2px", color: "#111827" }}>
            III. Demographic Distribution by Catchment Area / Sitio
          </div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Community / Catchment Area</th>
                <th style={{ width: "25%", textAlign: "center" }}>Constituents Assisted</th>
                <th style={{ width: "30%", textAlign: "center" }}>Verification Source</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.barangayReach || []).map((b) => (
                <tr key={b.barangay}>
                  <td><strong>{b.barangay}</strong></td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{b.count}</td>
                  <td style={{ textAlign: "center" }}>Digital Triage Verification / PhilSys</td>
                </tr>
              ))}
              {(!summary?.barangayReach || summary.barangayReach.length === 0) && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", fontStyle: "italic" }}>No community distribution records registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 4: Pharmacy Supplies & Inventory Transparency */}
        <div className="avoid-break" style={{ marginBottom: "14px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "9pt", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db", marginBottom: "6px", paddingBottom: "2px", color: "#111827" }}>
            IV. Municipal Pharmacy Supplies & Inventory Accountability Ledger
          </div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Generic Item Name</th>
                <th style={{ width: "25%" }}>Dosage / Formulation</th>
                <th style={{ width: "20%", textAlign: "center" }}>Stock Balance</th>
                <th style={{ width: "20%", textAlign: "center" }}>Supply Status</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m: any) => {
                const qty = Number(m.stock_quantity ?? m.stock ?? 0);
                const status = qty <= 0 ? "OUT OF STOCK" : qty <= 20 ? "LOW STOCK" : "AVAILABLE";

                return (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.dosage || "Standard"}</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{qty} {m.unit || "pcs"}</td>
                    <td style={{ textAlign: "center", fontWeight: qty <= 20 ? "bold" : "normal" }}>{status}</td>
                  </tr>
                );
              })}
              {medicines.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", fontStyle: "italic" }}>No pharmaceutical inventory records registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Forced Page Break for Chronological Registry Table */}
        <div className="page-break" />

        {/* Section 5: Itemized Consultation & Dispensing Registry */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #111827", paddingBottom: "4px", marginBottom: "8px" }}>
            <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "9.5pt", letterSpacing: "0.5px" }}>
              V. Itemized Patient Service & Dispensation Registry (Served Records)
            </div>
            <div style={{ fontSize: "8pt", fontStyle: "italic", color: "#4b5563" }}>
              Showing {completedTransactions.length} Verified Entries
            </div>
          </div>

          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: "13%" }}>Ref ID</th>
                <th style={{ width: "15%" }}>Date & Time</th>
                <th style={{ width: "22%" }}>Patient Full Name</th>
                <th style={{ width: "16%" }}>Sitio / Area</th>
                <th style={{ width: "16%" }}>Service Availed</th>
                <th style={{ width: "18%" }}>Clinical Action / Prescriptions</th>
              </tr>
            </thead>
            <tbody>
              {completedTransactions.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{row.id}</td>
                  <td style={{ fontSize: "8pt" }}>{row.date || "N/A"} {row.time ? `(${row.time})` : ""}</td>
                  <td><strong>{row.patientName}</strong></td>
                  <td>{row.barangay}</td>
                  <td>{row.reason}</td>
                  <td style={{ fontSize: "8pt" }}>{row.remarks || "Procedure completed as evaluated."}</td>
                </tr>
              ))}
              {completedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", fontStyle: "italic" }}>No completed patient consultations recorded for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Official Certification and Tri-Signatory Block */}
        <div className="avoid-break" style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #111827" }}>
          <p style={{ fontSize: "8.5pt", textAlign: "justify", fontStyle: "italic", marginBottom: "26px", color: "#374151" }}>
            I hereby certify under official oath that the clinical accomplishments, patient caseload numbers, and pharmaceutical disbursements detailed in this report represent an authentic, unedited record of medical assistance executed by the Barangay Kumintang Ilaya Primary Health Desk.
          </p>

          <table style={{ width: "100%", textAlign: "center", fontSize: "8.5pt", border: "none" }}>
            <tbody>
              <tr>
                <td style={{ width: "33%", verticalAlign: "top", padding: "0 10px" }}>
                  <p style={{ margin: "0 0 45px 0", color: "#4b5563" }}>Prepared & Submitted by:</p>
                  <div style={{ borderBottom: "1px solid #111827", width: "90%", margin: "0 auto" }} />
                  <p style={{ margin: "4px 0 0 0", fontWeight: "bold", textTransform: "uppercase" }}>Health Desk Administrator</p>
                  <p style={{ margin: "0", fontSize: "7.5pt", color: "#6b7280" }}>Primary Health Care Unit</p>
                </td>

                <td style={{ width: "33%", verticalAlign: "top", padding: "0 10px" }}>
                  <p style={{ margin: "0 0 45px 0", color: "#4b5563" }}>Reviewed & Attested by:</p>
                  <div style={{ borderBottom: "1px solid #111827", width: "90%", margin: "0 auto" }} />
                  <p style={{ margin: "4px 0 0 0", fontWeight: "bold", textTransform: "uppercase" }}>Committee on Health</p>
                  <p style={{ margin: "0", fontSize: "7.5pt", color: "#6b7280" }}>Sangguniang Barangay</p>
                </td>

                <td style={{ width: "33%", verticalAlign: "top", padding: "0 10px" }}>
                  <p style={{ margin: "0 0 45px 0", color: "#4b5563" }}>Noted & Endorsed by:</p>
                  <div style={{ borderBottom: "1px solid #111827", width: "90%", margin: "0 auto" }} />
                  <p style={{ margin: "4px 0 0 0", fontWeight: "bold", textTransform: "uppercase" }}>Punong Barangay</p>
                  <p style={{ margin: "0", fontSize: "7.5pt", color: "#6b7280" }}>Barangay Kumintang Ilaya</p>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: "center", fontSize: "7pt", color: "#6b7280", marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "4px" }}>
            Certified Barangay Health Record • Submitted for City Health Office (CHO) Monitoring & Sangguniang Panlungsod Archiving
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}