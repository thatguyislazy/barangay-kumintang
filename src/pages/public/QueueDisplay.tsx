import { useState, useEffect, useMemo, useCallback } from "react";
import { Volume2, VolumeX, Clock, Users, Bell } from "lucide-react";
import { supabase } from "../../supabase/supabase";
import { voiceService } from "../../services/voiceService";
import type { Appointment } from "../../types/appointment";

// Converts "09:00 AM" or "02:20 PM" to minutes from midnight for 24-hour sorting
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

export default function QueueDisplay() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAppointments = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", today)
      .eq("status", "Confirmed");

    if (error) {
      console.error("QueueDisplay: Error fetching appointments:", error.message);
      return;
    }

    if (data) {
      const mapped: Appointment[] = data.map((row: any) => ({
        id: row.id,
        patientName: row.patient_name,
        contactNumber: row.contact_number,
        barangay: row.barangay,
        date: row.date,
        time: row.time,
        reason: row.reason,
        notes: row.notes,
        idPhotoUrl: row.id_photo_url,
        remarks: row.remarks,
        completionPhotoUrl: row.completion_photo_url,
        status: row.status,
        createdAt: row.created_at,
      }));
      setAppointments(mapped);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel("public:appointments_queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAppointments]);

  // Overall chronological queue: sorted strictly by 24h clock minutes
  const queue = useMemo(() => {
    return [...appointments]
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
      .map((item, index) => ({
        ...item,
        queueNumber: index + 1,
      }));
  }, [appointments]);

  const nowServing = queue[0] || null;

  const vaccineQueue = useMemo(
    () => queue.filter((a) => a.reason.toLowerCase().includes("vaccin")),
    [queue]
  );
  const medicineQueue = useMemo(
    () =>
      queue.filter(
        (a) =>
          a.reason.toLowerCase().includes("medicin") ||
          a.reason.toLowerCase().includes("gamot")
      ),
    [queue]
  );
  const checkupQueue = useMemo(
    () =>
      queue.filter(
        (a) =>
          !a.reason.toLowerCase().includes("vaccin") &&
          !a.reason.toLowerCase().includes("medicin") &&
          !a.reason.toLowerCase().includes("gamot")
      ),
    [queue]
  );

  useEffect(() => {
    if (nowServing && audioEnabled && nowServing.id !== lastAnnouncedId) {
      setLastAnnouncedId(nowServing.id);
      const textToSpeak = `Calling Queue Number ${nowServing.queueNumber}, ${nowServing.patientName}, for ${nowServing.reason}. Please proceed to the clinic counter.`;
      voiceService.speak(textToSpeak);
    }
  }, [nowServing, audioEnabled, lastAnnouncedId]);

  const toggleAudio = () => {
    setAudioEnabled((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-white">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            <Bell className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white">
              Barangay Kumintang Ilaya Health Center
            </h1>
            <p className="text-xs font-semibold text-blue-400">
              Live Clinic Consultation & Triage Queue Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase transition-all shadow-md ${
              audioEnabled
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-amber-600 text-white hover:bg-amber-500 animate-bounce"
            }`}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="h-4 w-4" /> Sound Enabled
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4" /> Click to Enable Voice
              </>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-bold text-slate-200">
            <Clock className="h-4 w-4 text-blue-400" />
            <span>{currentTime || "--:--:--"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 lg:p-8">
        <div className="relative mb-8 overflow-hidden rounded-3xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-blue-300 border border-blue-400/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Now Serving at Counter
              </span>
              <div className="mt-3">
                <p className="text-6xl font-black tracking-tight text-white sm:text-7xl">
                  {nowServing ? `#${nowServing.queueNumber}` : "--"}
                </p>
                <h2 className="mt-2 text-3xl font-extrabold text-blue-100 sm:text-4xl">
                  {nowServing ? nowServing.patientName : "Waiting for Next Patient..."}
                </h2>
                {nowServing && (
                  <p className="mt-1 text-base font-semibold text-blue-300">
                    {nowServing.reason} • Scheduled Time: {nowServing.time}
                  </p>
                )}
              </div>
            </div>

            {nowServing && (
              <div className="flex flex-col items-center rounded-2xl border border-blue-400/20 bg-slate-900/90 p-5 text-center shadow-lg min-w-[220px]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reference Code
                </span>
                <span className="mt-1 text-2xl font-black text-amber-400">
                  {nowServing.id}
                </span>
                <span className="mt-2 text-xs font-semibold text-slate-400">
                  {nowServing.barangay}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3">
          {/* VACCINATION */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <h3 className="text-lg font-black uppercase tracking-wide text-white">
                  Vaccination
                </h3>
              </div>
              <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-800/40">
                {vaccineQueue.length} In Line
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
              {vaccineQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-2xl p-4 transition-all ${
                    nowServing?.id === item.id
                      ? "border border-blue-500 bg-blue-900/40 shadow-md"
                      : "border border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-blue-400">
                      Queue #{item.queueNumber}
                    </span>
                    <h4 className="text-base font-bold text-white">
                      {item.patientName}
                    </h4>
                    <span className="text-xs text-slate-400">{item.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-amber-400">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}

              {vaccineQueue.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Users className="h-8 w-8 stroke-1" />
                  <p className="mt-2 text-xs font-semibold">No patients in queue</p>
                </div>
              )}
            </div>
          </div>

          {/* MEDICINE */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <h3 className="text-lg font-black uppercase tracking-wide text-white">
                  Medicine
                </h3>
              </div>
              <span className="rounded-full bg-amber-950 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-800/40">
                {medicineQueue.length} In Line
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
              {medicineQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-2xl p-4 transition-all ${
                    nowServing?.id === item.id
                      ? "border border-blue-500 bg-blue-900/40 shadow-md"
                      : "border border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-blue-400">
                      Queue #{item.queueNumber}
                    </span>
                    <h4 className="text-base font-bold text-white">
                      {item.patientName}
                    </h4>
                    <span className="text-xs text-slate-400">{item.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-amber-400">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}

              {medicineQueue.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Users className="h-8 w-8 stroke-1" />
                  <p className="mt-2 text-xs font-semibold">No patients in queue</p>
                </div>
              )}
            </div>
          </div>

          {/* FREE CHECK-UP */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-cyan-500" />
                <h3 className="text-lg font-black uppercase tracking-wide text-white">
                  Free Check-Up
                </h3>
              </div>
              <span className="rounded-full bg-cyan-950 px-3 py-1 text-xs font-bold text-cyan-400 border border-cyan-800/40">
                {checkupQueue.length} In Line
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
              {checkupQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-2xl p-4 transition-all ${
                    nowServing?.id === item.id
                      ? "border border-blue-500 bg-blue-900/40 shadow-md"
                      : "border border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-blue-400">
                      Queue #{item.queueNumber}
                    </span>
                    <h4 className="text-base font-bold text-white">
                      {item.patientName}
                    </h4>
                    <span className="text-xs text-slate-400">{item.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-amber-400">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}

              {checkupQueue.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Users className="h-8 w-8 stroke-1" />
                  <p className="mt-2 text-xs font-semibold">No patients in queue</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}