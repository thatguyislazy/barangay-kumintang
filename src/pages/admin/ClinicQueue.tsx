import { useState, useEffect, useMemo, useCallback, type ChangeEvent, type FormEvent } from "react";
import {
  Users,
  Megaphone,
  Camera,
  Loader2,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Clock,
  Phone,
  FileText,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { appointmentService } from "../../services/appointmentService";
import { supabase } from "../../supabase/supabase";
import type { Appointment } from "../../types/appointment";

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 9999;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) {
    hours = 0;
  } else if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
}

export default function ClinicQueue() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCalling, setIsCalling] = useState<string | null>(null);

  // Completion Form State
  const [remarks, setRemarks] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState<boolean>(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await appointmentService.list();
      setAppointments(data);
    } catch (err) {
      console.error("ClinicQueue: Error loading appointments:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();

    const channel = supabase
      .channel("admin_db_queue_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAppointments]);

  // Naka-sort batay sa 24-hour time (AM muna bago PM)
  const todayQueue = useMemo(() => {
    return appointments
      .filter((a) => a.date === todayStr && a.status === "Confirmed")
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
      .map((item, index) => ({
        ...item,
        queueNumber: index + 1,
      }));
  }, [appointments, todayStr]);

  const nowServing = todayQueue[0] || null;

  // Tanging magpapadala ng broadcast sa TV Monitor screen - WALANG AUDIO DITO SA ADMIN
  const triggerTvBroadcast = async (item: Appointment & { queueNumber: number }) => {
    try {
      setIsCalling(item.id);
      const broadcastChannel = supabase.channel("clinic_tv_monitor_stream");
      await broadcastChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await broadcastChannel.send({
            type: "broadcast",
            event: "TRIGGER_PATIENT_CALL",
            payload: {
              id: item.id,
              queueNumber: item.queueNumber,
              patientName: item.patientName,
              reason: item.reason,
              time: item.time,
              timestamp: Date.now(),
            },
          });
          setTimeout(() => {
            supabase.removeChannel(broadcastChannel);
            setIsCalling(null);
          }, 600);
        }
      });
    } catch (err) {
      console.error("Failed to broadcast to TV monitor:", err);
      setIsCalling(null);
    }
  };

  const handleOpenCompleteModal = (item: Appointment) => {
    setSelectedAppointment(item);
    setRemarks("");
    setProofFile(null);
    setProofPreview("");
  };

  const handleProofChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteConsultation = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      setIsSubmittingCompletion(true);
      let proofUrl: string | undefined = undefined;

      if (proofFile) {
        proofUrl = await appointmentService.uploadCompletionPhoto(proofFile);
      }

      await appointmentService.completeAppointment(
        selectedAppointment.id,
        remarks.trim(),
        proofUrl
      );

      setSelectedAppointment(null);
      await loadAppointments();
    } catch (err) {
      console.error("Error completing consultation:", err);
      alert("Failed to finalize consultation records. Please try again.");
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  return (
    <AdminLayout
      title="Clinic Queue & Triage Desk"
      description="Manage today's consultation line, send announcements to TV monitor, and verify patient records."
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
              Clinic Live Queue Triage
            </h1>
            <p className="text-sm text-ink-500 dark:text-white/60">
              Active consultations for today ({todayStr}) • {todayQueue.length} patient(s) lined up
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAppointments}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-xs font-bold text-navy-800 shadow-soft hover:bg-navy-50 dark:border-white/10 dark:bg-navy-900 dark:text-white cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {nowServing && (
              <button
                onClick={() => triggerTvBroadcast(nowServing)}
                disabled={isCalling === nowServing.id}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lift hover:bg-blue-500 active:scale-95 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isCalling === nowServing.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Megaphone className="h-4 w-4" />
                )}
                Call Next on TV (#{nowServing.queueNumber} - {nowServing.patientName})
              </button>
            )}
          </div>
        </div>

        {/* NOW SERVING CARDS / BANNER */}
        {nowServing && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-blue-500/40 bg-gradient-to-r from-blue-900/10 via-white to-blue-50/50 p-6 shadow-xl dark:border-blue-500/30 dark:from-navy-900 dark:via-navy-900/90 dark:to-blue-950/40">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-white shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
                  Currently Serving at Counter
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-black text-blue-700 dark:text-blue-400">
                    #{nowServing.queueNumber}
                  </span>
                  <h2 className="text-2xl font-black text-navy-900 dark:text-white">
                    {nowServing.patientName}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-ink-600 dark:text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    Appointed: {nowServing.time}
                  </span>
                  <span>•</span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    {nowServing.reason}
                  </span>
                  <span>•</span>
                  <span>Ref: {nowServing.id}</span>
                  <span>•</span>
                  <span>Barangay: {nowServing.barangay}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => triggerTvBroadcast(nowServing)}
                  disabled={isCalling === nowServing.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-navy-300 bg-white px-4 py-2.5 text-xs font-bold text-navy-800 shadow-soft hover:bg-navy-50 dark:border-white/20 dark:bg-navy-800 dark:text-white cursor-pointer active:scale-95"
                >
                  <Megaphone className="h-4 w-4 text-blue-600" />
                  Broadcast TV Call
                </button>
                <button
                  onClick={() => handleOpenCompleteModal(nowServing)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lift hover:bg-emerald-500 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Served / Finished
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULL PATIENT QUEUE TABLE */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white/50 dark:border-white/10 dark:bg-navy-900/40">
            <Loader2 className="h-7 w-7 animate-spin text-navy-800 dark:text-white" />
            <span className="text-xs font-medium text-ink-500 dark:text-white/60">
              Loading confirmed patient tickets...
            </span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm dark:border-white/10 dark:bg-navy-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 bg-navy-50/50 text-xs font-bold uppercase tracking-wider text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-6 py-4">Queue #</th>
                  <th className="px-6 py-4">Patient Information</th>
                  <th className="px-6 py-4">Medical Service</th>
                  <th className="px-6 py-4">Schedule Time</th>
                  <th className="px-6 py-4">PhilSys / ID Document</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-white/10">
                {todayQueue.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      nowServing?.id === item.id
                        ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium"
                        : "hover:bg-navy-50/40 dark:hover:bg-white/5"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 font-mono text-xs font-black text-white dark:bg-blue-600 shadow-sm">
                        #{item.queueNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-navy-900 dark:text-white">
                        {item.patientName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-500 dark:text-white/50">
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {item.id}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {item.contactNumber}
                        </span>
                        <span>•</span>
                        <span>{item.barangay}</span>
                      </div>
                      {item.notes && (
                        <p className="mt-1 text-xs italic text-ink-400 dark:text-white/40">
                          Note: {item.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-navy-100/80 px-2.5 py-1 text-xs font-bold text-navy-800 dark:bg-white/10 dark:text-white">
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        {item.time}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.idPhotoUrl ? (
                        <a
                          href={item.idPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-white/10 dark:bg-navy-800 dark:text-blue-400"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Verify ID
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400 dark:text-white/40">
                          No ID uploaded
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => triggerTvBroadcast(item)}
                          disabled={isCalling === item.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 shadow-soft hover:bg-navy-50 dark:border-white/10 dark:bg-navy-800 dark:text-white cursor-pointer active:scale-95"
                          title="Broadcast Audio on TV Display"
                        >
                          <Megaphone className="h-3.5 w-3.5 text-blue-600" />
                          Broadcast TV
                        </button>
                        <button
                          onClick={() => handleOpenCompleteModal(item)}
                          className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-emerald-500 cursor-pointer active:scale-95"
                        >
                          Served
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {todayQueue.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-ink-500 dark:text-white/40"
                    >
                      <Users className="mx-auto h-8 w-8 stroke-1 text-navy-400" />
                      <p className="mt-2 font-medium">No confirmed patients queued for today.</p>
                      <p className="text-xs">Appointments confirmed in the admin booking tab will appear here.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CONSULTATION COMPLETION MODAL */}
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
              onClick={() => !isSubmittingCompletion && setSelectedAppointment(null)}
            />
            <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-navy-900 border border-navy-100 dark:border-white/10">
              <h2 className="font-display text-xl font-bold text-navy-900 dark:text-white">
                Finalize Consultation - {selectedAppointment.patientName}
              </h2>
              <p className="mt-1 text-xs text-ink-500 dark:text-white/60">
                Ticket: {selectedAppointment.id} • Service: {selectedAppointment.reason}
              </p>

              <form onSubmit={handleCompleteConsultation} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Clinical Remarks & Prescriptions Given *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter diagnosis, given medicines, or health advisories..."
                    className="mt-1.5 w-full rounded-xl border border-navy-200 bg-white p-3 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Proof Photo of Consultation / Receipt (Optional)
                  </label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-navy-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/5">
                      <Camera className="h-4 w-4 text-blue-600" />
                      Take / Select Photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleProofChange}
                      />
                    </label>
                    {proofPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview("");
                        }}
                        className="text-xs text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {proofPreview && (
                    <div className="mt-2 h-28 w-full overflow-hidden rounded-xl border border-navy-100 dark:border-white/10">
                      <img
                        src={proofPreview}
                        alt="Proof"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-navy-100 dark:border-white/10">
                  <button
                    type="button"
                    disabled={isSubmittingCompletion}
                    onClick={() => setSelectedAppointment(null)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-surface-soft dark:text-white/70 dark:hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCompletion}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingCompletion && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmittingCompletion ? "Saving..." : "Mark as Completed"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}