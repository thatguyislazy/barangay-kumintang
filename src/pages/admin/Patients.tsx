import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Filter,
  FileText,
  ExternalLink,
  Loader2,
  Calendar,
  Clock,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  CheckCircle2,
  X,
  XCircle,
  AlertCircle,
  Pill,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { appointmentService } from "../../services/appointmentService";
import type { Appointment } from "../../types/appointment";

const ITEMS_PER_PAGE = 10;

export default function Patients() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [serviceFilter, setServiceFilter] = useState<string>("All");
  const [selectedRecord, setSelectedRecord] = useState<Appointment | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await appointmentService.list();
      setAppointments(data);
    } catch (err) {
      console.error("Error fetching patient records:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset to page 1 whenever filters or search terms change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, serviceFilter]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return appointments.filter((record) => {
      const matchSearch =
        record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.contactNumber.includes(searchTerm) ||
        record.barangay.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "All" || record.status === statusFilter;

      const recordReason = (record.reason || "").toLowerCase();
      const matchService =
        serviceFilter === "All" ||
        (serviceFilter === "Medicine" &&
          (recordReason.includes("medicin") ||
            recordReason.includes("gamot") ||
            recordReason.includes("pharmac"))) ||
        (serviceFilter === "Free Check-up" &&
          (recordReason.includes("check") ||
            recordReason.includes("consult") ||
            recordReason.includes("check-up") ||
            recordReason.includes("checkup"))) ||
        (serviceFilter === "Vaccination" &&
          (recordReason.includes("vaccin") ||
            recordReason.includes("bakuna") ||
            recordReason.includes("immuniz"))) ||
        recordReason === serviceFilter.toLowerCase();

      return matchSearch && matchStatus && matchService;
    });
  }, [appointments, searchTerm, statusFilter, serviceFilter]);

  // Pagination calculations
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Windowed pagination range (e.g. 1 ... 4 5 6 ... 15)
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);

    if (left > 2) {
      range.push("...");
    }

    for (let i = left; i <= right; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }

    if (right < totalPages - 1) {
      range.push("...");
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [currentPage, totalPages]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "Confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            <Clock className="h-3 w-3" />
            Confirmed
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <AdminLayout
      title="Patient Records & Medical History"
      description="Access full consultation records, procedure photo proof, and medication logs."
    >
      <div className="space-y-6">
        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, Ticket Ref ID, phone, or barangay..."
              className="w-full rounded-xl border border-navy-200 bg-white py-2.5 pl-10 pr-4 text-xs text-navy-900 outline-none focus:border-navy-500 dark:border-white/10 dark:bg-navy-900 dark:text-white"
            />
          </div>

          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-navy-200 bg-white py-2.5 pl-9 pr-3 text-xs text-navy-900 outline-none focus:border-navy-500 dark:border-white/10 dark:bg-navy-900 dark:text-white"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full rounded-xl border border-navy-200 bg-white py-2.5 px-3 text-xs text-navy-900 outline-none focus:border-navy-500 dark:border-white/10 dark:bg-navy-900 dark:text-white"
            >
              <option value="All">All Services</option>
              <option value="Medicine">Medicine</option>
              <option value="Free Check-up">Free Check-up</option>
              <option value="Vaccination">Vaccination</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white/50 dark:border-white/10 dark:bg-navy-900/40">
            <Loader2 className="h-7 w-7 animate-spin text-navy-800 dark:text-white" />
            <span className="text-xs font-medium text-ink-500 dark:text-white/60">
              Loading medical records...
            </span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm dark:border-white/10 dark:bg-navy-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 bg-navy-50/50 text-xs font-bold uppercase tracking-wider text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-6 py-4">Ticket Ref</th>
                  <th className="px-6 py-4">Patient Name</th>
                  <th className="px-6 py-4">Barangay & Contact</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Consultation Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-white/10">
                {paginatedRecords.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-navy-50/40 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-navy-900 dark:text-white">
                        {item.patientName}
                      </div>
                      {item.remarks && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-ink-500 dark:text-white/50">
                          {item.remarks}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-500 dark:text-white/60">
                      <div className="flex items-center gap-1.5 font-medium text-navy-800 dark:text-white">
                        <MapPin className="h-3 w-3 text-red-500" />
                        {item.barangay}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {item.contactNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-navy-100/80 px-2.5 py-1 text-xs font-semibold text-navy-800 dark:bg-white/10 dark:text-white">
                        {item.reason.toLowerCase().includes("medicin") && (
                          <Pill className="h-3 w-3 text-blue-500" />
                        )}
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-navy-800 dark:text-white/80">
                      <div>{item.date || "Not set"}</div>
                      <div className="text-ink-400 dark:text-white/50">{item.time || "--"}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 shadow-soft hover:bg-navy-50 dark:border-white/10 dark:bg-navy-800 dark:text-white cursor-pointer active:scale-95 transition-all"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        View File
                      </button>
                    </td>
                  </tr>
                ))}

                {paginatedRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-ink-500 dark:text-white/40"
                    >
                      <FileText className="mx-auto h-8 w-8 stroke-1 text-navy-400" />
                      <p className="mt-2 font-medium">No patient records match your criteria.</p>
                      <p className="text-xs">Try clearing or adjusting search filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-navy-100 px-6 py-4 text-xs text-ink-500 sm:flex-row dark:border-white/10 dark:text-white/60">
                <div>
                  Showing <span className="font-bold text-navy-900 dark:text-white">{startIndex}</span> to{" "}
                  <span className="font-bold text-navy-900 dark:text-white">{endIndex}</span> of{" "}
                  <span className="font-bold text-navy-900 dark:text-white">{totalItems}</span> patients
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Jump to first page */}
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    title="First page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-800 shadow-soft hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-navy-800 dark:text-white cursor-pointer"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>

                  {/* Previous 10 items */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-3 py-1.5 font-bold text-navy-800 shadow-soft hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-navy-800 dark:text-white cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>

                  {/* Windowed page buttons */}
                  <div className="flex items-center gap-1">
                    {paginationRange.map((page, idx) =>
                      page === "..." ? (
                        <span key={`dots-${idx}`} className="px-2 text-ink-400 dark:text-white/40">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(Number(page))}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? "bg-blue-600 text-white shadow-sm"
                              : "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 dark:border-white/10 dark:bg-navy-800 dark:text-white"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  {/* Next 10 items */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-3 py-1.5 font-bold text-navy-800 shadow-soft hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-navy-800 dark:text-white cursor-pointer"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  {/* Jump to last page */}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-800 shadow-soft hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-navy-800 dark:text-white cursor-pointer"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Medical Records & Procedure Details Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
              onClick={() => setSelectedRecord(null)}
            />
            <div className="relative w-full max-w-3xl rounded-3xl bg-navy-950 p-6 text-white shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Medical Records & Procedure Details</h2>
                    <p className="text-xs text-white/60">
                      Patient: <strong className="text-white">{selectedRecord.patientName}</strong> •{" "}
                      {selectedRecord.contactNumber} • {selectedRecord.barangay}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Badges Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-900/60 px-2.5 py-1 text-blue-300 font-mono">
                    Ref: {selectedRecord.id}
                  </span>
                  <span className="rounded-lg bg-emerald-950/60 px-2.5 py-1 text-emerald-400 border border-emerald-500/30">
                    {selectedRecord.reason}
                  </span>
                  <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-emerald-300">
                    {selectedRecord.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" />
                    {selectedRecord.date || "N/A"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    {selectedRecord.time || "N/A"}
                  </span>
                </div>
              </div>

              {/* Treatment Remarks Section */}
              <div className="mt-2 rounded-2xl bg-white/5 p-4 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                  <FileText className="h-4 w-4" />
                  Conducted Clinical Procedure & Doctor Remarks
                </div>
                <div className="rounded-xl bg-black/30 p-3 text-sm text-white/90 whitespace-pre-line font-mono text-xs">
                  {selectedRecord.remarks || "No treatment remarks or prescription recorded."}
                </div>
              </div>

              {/* Proof Photos Grid */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Procedure Proof Photo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Procedure & Consultation Proof Photo
                  </label>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 h-48 flex items-center justify-center">
                    {selectedRecord.completionPhotoUrl ? (
                      <a
                        href={selectedRecord.completionPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative h-full w-full"
                      >
                        <img
                          src={selectedRecord.completionPhotoUrl}
                          alt="Procedure proof"
                          className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold gap-1 text-white">
                          <ExternalLink className="h-3.5 w-3.5" /> Click to view full image
                        </div>
                      </a>
                    ) : (
                      <span className="text-xs text-white/40">No procedure proof photo</span>
                    )}
                  </div>
                </div>

                {/* PhilSys / Identity Proof */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                    PhilSys / Identity Proof
                  </label>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 h-48 flex items-center justify-center">
                    {selectedRecord.idPhotoUrl ? (
                      <a
                        href={selectedRecord.idPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative h-full w-full"
                      >
                        <img
                          src={selectedRecord.idPhotoUrl}
                          alt="PhilSys ID"
                          className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold gap-1 text-white">
                          <ExternalLink className="h-3.5 w-3.5" /> Click to view full image
                        </div>
                      </a>
                    ) : (
                      <span className="text-xs text-white/40">No PhilSys / ID uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-soft hover:bg-blue-500 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}