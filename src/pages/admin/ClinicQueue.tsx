import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from "react";
import {
  Users,
  Megaphone,
  Camera,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { appointmentService } from "../../services/appointmentService";
import { voiceService } from "../../services/voiceService";
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
      .channel("admin:clinic_queue")
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

  const handleCallPatient = (item: Appointment & { queueNumber: number }) => {
    const speech = `Calling Queue Number ${item.queueNumber}, ${item.patientName}, for ${item.reason}. Please proceed to the clinic triage counter.`;
    voiceService.speak(speech);
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

  const handleCompleteConsultation = async (e: React.FormEvent) => {
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
      description="Call patients, verify residency documents, and complete medical consultations."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
              Clinic Live Queue Triage
            </h1>
            <p className="text-sm text-ink-500 dark:text-white/60">
              Active queue list for today ({todayStr}).
            </p>
          </div>

          {nowServing && (
            <button
              onClick={() => handleCallPatient(nowServing)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lift hover:bg-blue-500 cursor-pointer transition-all"
            >
              <Megaphone className="h-4 w-4" />
              Call Next (#{nowServing.queueNumber} - {nowServing.patientName})
            </button>
          )}
        </div>

        {nowServing && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Current In Counter: Queue #{nowServing.queueNumber}
                </span>
                <h2 className="mt-2 font-display text-2xl font-bold text-navy-900 dark:text-white">
                  {nowServing.patientName}
                </h2>
                <p className="text-sm text-ink-600 dark:text-white/70">
                  {nowServing.reason} • Scheduled: <span className="font-bold text-navy-800 dark:text-blue-300">{nowServing.time}</span> • Barangay: {nowServing.barangay}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCallPatient(nowServing)}
                  className="rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-xs font-bold text-navy-800 hover:bg-navy-50 dark:border-white/10 dark:bg-navy-900 dark:text-white cursor-pointer"
                >
                  Recall Voice
                </button>
                <button
                  onClick={() => handleOpenCompleteModal(nowServing)}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Complete / Served
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white/50 dark:border-white/10 dark:bg-navy-900/40">
            <Loader2 className="h-7 w-7 animate-spin text-navy-800 dark:text-white" />
            <span className="text-xs font-medium text-ink-500 dark:text-white/60">
              Loading clinic queue...
            </span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm dark:border-white/10 dark:bg-navy-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 bg-navy-50/50 text-xs font-bold uppercase tracking-wider text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-6 py-4">Queue #</th>
                  <th className="px-6 py-4">Patient & Reference</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Appointed Time</th>
                  <th className="px-6 py-4">ID Proof</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-white/10">
                {todayQueue.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      nowServing?.id === item.id
                        ? "bg-blue-50/40 dark:bg-blue-950/20 font-semibold"
                        : "hover:bg-navy-50/30 dark:hover:bg-white/5"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-xs font-black text-white dark:bg-blue-600">
                        #{item.queueNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-navy-900 dark:text-white">
                        {item.patientName}
                      </div>
                      <div className="text-xs text-ink-400 dark:text-white/40">
                        {item.id} • {item.contactNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink-700 dark:text-white/80">
                      {item.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
                        {item.time}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.idPhotoUrl ? (
                        <a
                          href={item.idPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View ID <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400 dark:text-white/40">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCallPatient(item)}
                          className="rounded-lg bg-navy-100 p-2 text-navy-800 hover:bg-navy-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 cursor-pointer"
                          title="Call Voice Announcement"
                        >
                          <Megaphone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenCompleteModal(item)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
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
                      <Users className="mx-auto h-8 w-8 stroke-1" />
                      <p className="mt-2 font-medium">No confirmed patients queued for today.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
              onClick={() => !isSubmittingCompletion && setSelectedAppointment(null)}
            />
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-900">
              <h2 className="font-display text-xl font-bold text-navy-900 dark:text-white">
                Finalize Consultation - {selectedAppointment.patientName}
              </h2>
              <p className="mt-1 text-xs text-ink-500 dark:text-white/60">
                Log doctor/nurse clinical remarks and optional photo documentation.
              </p>

              <form onSubmit={handleCompleteConsultation} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Clinical Remarks / Prescriptions Given
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter diagnosis, given medicines, or medical advice..."
                    className="mt-1 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Proof Photo of Consultation (Optional)
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-navy-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/5">
                      <Camera className="h-4 w-4" />
                      Take / Upload Photo
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

                <div className="flex justify-end gap-2.5 pt-4">
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