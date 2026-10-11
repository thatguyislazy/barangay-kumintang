import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  Phone,
  Calendar,
  FileText,
  Clock,
  Image as ImageIcon,
  X,
  Loader2,
  ZoomIn,
  Stethoscope,
  Syringe,
  Pill,
  Activity,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { appointmentService } from "../../services/appointmentService";
import type { Appointment } from "../../types/appointment";

interface PatientRecord {
  patientName: string;
  contactNumber: string;
  barangay: string;
  totalVisits: number;
  lastVisit: string;
  history: Appointment[];
}

export default function Patients() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  // Lightbox Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await appointmentService.list();
      setAppointments(data);
    } catch (err) {
      console.error("Patients: Error loading records:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // I-grupo ang appointments ayon sa pasyente
  const patientRecords = useMemo(() => {
    const map = new Map<string, PatientRecord>();

    appointments.forEach((apt) => {
      const patientName = apt.patientName || "Unknown Patient";
      const contactNumber = apt.contactNumber || "N/A";
      const recordDate = apt.date || "";

      const key = `${patientName.toLowerCase()}_${contactNumber}`;
      const existing = map.get(key);

      if (existing) {
        existing.history.push(apt);
        existing.totalVisits += 1;
        if (recordDate && recordDate > existing.lastVisit) {
          existing.lastVisit = recordDate;
        }
      } else {
        map.set(key, {
          patientName,
          contactNumber,
          barangay: apt.barangay || "Kumintang Ilaya",
          totalVisits: 1,
          lastVisit: recordDate || "N/A",
          history: [apt],
        });
      }
    });

    const list = Array.from(map.values()).map((p) => ({
      ...p,
      history: p.history.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    }));

    return list.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }, [appointments]);

  // Search filter
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patientRecords;
    const term = searchTerm.toLowerCase();
    return patientRecords.filter(
      (p) =>
        p.patientName.toLowerCase().includes(term) ||
        p.contactNumber.includes(term) ||
        p.barangay.toLowerCase().includes(term)
    );
  }, [patientRecords, searchTerm]);

  // Helper para sa icon at badge ng isinagawang procedure
  const getProcedureMeta = (reason: string) => {
    const lower = reason.toLowerCase();
    if (lower.includes("vaccin")) {
      return {
        icon: Syringe,
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        label: "Immunization & Vaccine Administration",
      };
    }
    if (lower.includes("medicin") || lower.includes("gamot")) {
      return {
        icon: Pill,
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        label: "Pharmaceutical Prescription & Dispensing",
      };
    }
    return {
      icon: Stethoscope,
      badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      label: "General Clinical Diagnosis & Examination",
    };
  };

  return (
    <AdminLayout
      title="Patient Master Records"
      description="View patient consultation histories, clinical remarks, prescriptions, and proof documentation."
    >
      <div className="space-y-6">
        {/* Top Header & Search Filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
              Patient Medical Records
            </h1>
            <p className="text-sm text-ink-500 dark:text-white/60">
              Total registered individuals: {patientRecords.length}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-ink-400 dark:text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, barangay..."
              className="w-full rounded-xl border border-navy-200 bg-white py-2 pl-9 pr-4 text-xs text-navy-900 outline-none focus:border-navy-500 dark:border-white/10 dark:bg-navy-900 dark:text-white"
            />
          </div>
        </div>

        {/* PATIENT DIRECTORY TABLE */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white/50 dark:border-white/10 dark:bg-navy-900/40">
            <Loader2 className="h-7 w-7 animate-spin text-navy-800 dark:text-white" />
            <span className="text-xs font-medium text-ink-500 dark:text-white/60">
              Loading patient directories...
            </span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm dark:border-white/10 dark:bg-navy-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 bg-navy-50/50 text-xs font-bold uppercase tracking-wider text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-6 py-4">Patient Name</th>
                  <th className="px-6 py-4">Contact & Location</th>
                  <th className="px-6 py-4">Total Consultations</th>
                  <th className="px-6 py-4">Last Visit</th>
                  <th className="px-6 py-4 text-right">Medical History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-white/10">
                {filteredPatients.map((patient) => (
                  <tr
                    key={`${patient.patientName}_${patient.contactNumber}`}
                    className="hover:bg-navy-50/30 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-navy-900 dark:text-white">
                      {patient.patientName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-ink-600 dark:text-white/70">
                        <Phone className="h-3 w-3 text-blue-600" />
                        {patient.contactNumber}
                      </div>
                      <div className="text-xs text-ink-400 dark:text-white/40">
                        {patient.barangay}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {patient.totalVisits} visit(s)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-ink-600 dark:text-white/70">
                      {patient.lastVisit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPatient(patient)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-blue-500 cursor-pointer active:scale-95 transition-all"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View Remarks & Records
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-ink-500 dark:text-white/40"
                    >
                      <Users className="mx-auto h-8 w-8 stroke-1 text-navy-400" />
                      <p className="mt-2 font-medium">No patient records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL 1: PATIENT CONSULTATION HISTORY & PROCEDURE PREVIEW */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
              onClick={() => setSelectedPatient(null)}
            />
            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-navy-100 bg-white shadow-2xl dark:border-white/10 dark:bg-navy-900">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-navy-900 dark:text-white">
                      Medical Records & Procedure Details
                    </h2>
                    <p className="text-xs text-ink-500 dark:text-white/60">
                      Patient: <strong className="text-navy-900 dark:text-white">{selectedPatient.patientName}</strong> • {selectedPatient.contactNumber} • {selectedPatient.barangay}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="rounded-xl p-2 text-ink-400 hover:bg-navy-50 hover:text-navy-900 dark:text-white/60 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body / History List */}
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                {selectedPatient.history.map((record) => {
                  const meta = getProcedureMeta(record.reason);
                  const ProcedureIcon = meta.icon;

                  return (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-navy-200/80 bg-navy-50/30 p-5 dark:border-white/10 dark:bg-white/5 space-y-4"
                    >
                      {/* Top Header of Ticket */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100 pb-3 dark:border-white/10">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/50">
                            Ref: {record.id}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${meta.badgeBg}`}
                          >
                            <ProcedureIcon className="h-3.5 w-3.5" />
                            {record.reason}
                          </span>
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                              record.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            <CheckCircle2 className="inline h-3 w-3 mr-1" />
                            {record.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-medium text-ink-500 dark:text-white/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            {record.date || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            {record.time || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* PROCEDURE DETAILS PREVIEW CARD */}
                      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-navy-800/60">
                        <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                          <FileCheck2 className="h-4 w-4" />
                          Conducted Clinical Procedure: {meta.label}
                        </div>

                        {/* Intake Complaint Notes (kung meron) */}
                        {record.notes && (
                          <div className="mb-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
                            <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                              Patient Complaint / Pre-consultation Note:
                            </span>
                            {record.notes}
                          </div>
                        )}

                        {/* Clinical Remarks & Treatment Prescriptions */}
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-white/60 block mb-1">
                            Doctor / Healthcare Worker Treatment & Remarks:
                          </span>
                          <p className="text-xs text-navy-900 dark:text-white whitespace-pre-line bg-navy-50/60 dark:bg-navy-900/80 p-3 rounded-xl border border-navy-100 dark:border-white/10">
                            {record.remarks || (
                              <span className="italic text-ink-400 dark:text-white/40">
                                Walang naitalang karagdagang clinical remarks.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* INLINE IMAGE PREVIEWS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Consultation Proof Photo */}
                        {record.completionPhotoUrl ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" /> Procedure & Consultation Proof Photo
                            </span>
                            <div
                              onClick={() =>
                                setPreviewImage({
                                  url: record.completionPhotoUrl!,
                                  title: `Procedure Proof - ${record.patientName} (${record.date} - ${record.reason})`,
                                })
                              }
                              className="group relative h-36 w-full cursor-pointer overflow-hidden rounded-xl border border-emerald-300/60 bg-black/5 dark:border-emerald-800/40"
                            >
                              <img
                                src={record.completionPhotoUrl}
                                alt="Procedure Proof"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                                  <ZoomIn className="h-3.5 w-3.5" /> Enlarge Image
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* PhilSys / Valid ID Photo */}
                        {record.idPhotoUrl ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                              <FileText className="h-3 w-3" /> PhilSys / Identity Proof
                            </span>
                            <div
                              onClick={() =>
                                setPreviewImage({
                                  url: record.idPhotoUrl!,
                                  title: `PhilSys ID - ${record.patientName}`,
                                })
                              }
                              className="group relative h-36 w-full cursor-pointer overflow-hidden rounded-xl border border-blue-300/60 bg-black/5 dark:border-blue-800/40"
                            >
                              <img
                                src={record.idPhotoUrl}
                                alt="PhilSys ID"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                                  <ZoomIn className="h-3.5 w-3.5" /> Enlarge Image
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end border-t border-navy-100 px-6 py-3.5 dark:border-white/10">
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="rounded-xl bg-navy-100 px-5 py-2 text-xs font-bold text-navy-900 hover:bg-navy-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: FULL-SCREEN LIGHTBOX PREVIEW */}
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setPreviewImage(null)}
            />
            <div className="relative flex max-h-[92vh] max-w-4xl flex-col items-center overflow-hidden rounded-3xl bg-slate-950 p-4 shadow-2xl border border-white/10">
              <div className="flex w-full items-center justify-between pb-3 px-2">
                <h3 className="text-sm font-bold text-white truncate max-w-lg">
                  {previewImage.title}
                </h3>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black max-h-[75vh] w-full">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-h-[75vh] w-auto max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}