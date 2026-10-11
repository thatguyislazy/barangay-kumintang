import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Users,
  Syringe,
  Pill,
  Stethoscope,
  Activity,
  Sparkles,
  Radio,
  Clock,
} from "lucide-react";
import { supabase } from "../../supabase/supabase";
import { voiceService } from "../../services/voiceService";
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

export default function QueueDisplay() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [flashingId, setFlashingId] = useState<string | null>(null);

  const [activeCall, setActiveCall] = useState<{
    id: string;
    queueNumber: number;
    patientName: string;
    reason: string;
    time?: string;
  } | null>(null);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
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
      console.error("QueueDisplay: Error fetching list:", error.message);
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

  // Realtime Data + Broadcast Listener para sa TV Audio
  useEffect(() => {
    fetchAppointments();

    const dbChannel = supabase
      .channel("public:tv_queue_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    // Dito lamang tatakbo ang boses kapag nag-broadcast ang admin
    const broadcastChannel = supabase
      .channel("clinic_tv_monitor_stream")
      .on("broadcast", { event: "TRIGGER_PATIENT_CALL" }, (payload) => {
        const item = payload.payload;
        if (item) {
          setActiveCall({
            id: item.id,
            queueNumber: item.queueNumber,
            patientName: item.patientName,
            reason: item.reason,
            time: item.time,
          });

          // Visual strobe animation
          setFlashingId(item.id);
          setTimeout(() => setFlashingId(null), 8000);

          // Audio speech announcement
          if (audioEnabled) {
            const speechText = `Calling Queue Number ${item.queueNumber}, ${item.patientName}, for ${item.reason}. Please proceed to the clinic triage counter.`;
            voiceService.speak(speechText);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [fetchAppointments, audioEnabled]);

  // Overall chronological queue: Inayos ayon sa 24-hour time
  const queue = useMemo(() => {
    return [...appointments]
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
      .map((item, index) => ({
        ...item,
        queueNumber: index + 1,
      }));
  }, [appointments]);

  const nowServing = activeCall || (queue.length > 0 ? queue[0] : null);

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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* TOP HEADER */}
      <header className="flex h-20 items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 shadow-lg shadow-blue-500/25">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white">
              Barangay Kumintang Ilaya
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Community Health Center • Live Triage Display Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Audio Activator Button */}
          <button
            onClick={() => setAudioEnabled((prev) => !prev)}
            className={`flex items-center gap-2.5 rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 ${
              audioEnabled
                ? "bg-emerald-600 text-white shadow-emerald-950/40 hover:bg-emerald-500"
                : "bg-amber-500 text-slate-950 shadow-amber-500/30 animate-pulse hover:bg-amber-400"
            }`}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="h-4 w-4" /> TV Audio Active
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4" /> Enable TV Audio
              </>
            )}
          </button>

          <div className="flex flex-col items-end border-l border-slate-800 pl-5">
            <span className="font-mono text-2xl font-black tracking-tight text-white">
              {currentTime || "--:--:--"}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {currentDate}
            </span>
          </div>
        </div>
      </header>

      {/* DUAL SECTION SCREEN */}
      <main className="grid flex-1 grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* LEFT COLUMN: NOW SERVING JUMBOTRON CARD */}
        <section
          className={`col-span-5 flex flex-col justify-between rounded-3xl border p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-500 ${
            flashingId
              ? "border-blue-400 bg-gradient-to-b from-blue-900/90 via-slate-900 to-slate-950 ring-4 ring-blue-500/40"
              : "border-blue-500/30 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-blue-950/30"
          }`}
        >
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          {/* Card Header Tag */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-blue-300">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              Now Serving At Counter
            </span>
            <span className="text-xs font-bold text-slate-400">
              Total Waiting: {queue.length}
            </span>
          </div>

          {/* Ticket Number & Name */}
          <div className="my-auto text-center py-6">
            <div className="inline-block rounded-3xl bg-blue-600/20 border border-blue-500/40 px-12 py-5 shadow-2xl">
              <span className="font-mono text-8xl font-black tracking-tighter text-blue-400 drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]">
                {nowServing ? `#${nowServing.queueNumber}` : "--"}
              </span>
            </div>

            <h2 className="mt-8 text-4xl font-extrabold text-white tracking-tight line-clamp-2">
              {nowServing ? nowServing.patientName : "Waiting for Next Patient..."}
            </h2>

            {nowServing && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 px-4 py-2 text-sm font-bold text-slate-200">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  {nowServing.reason}
                </span>
                {nowServing.time && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 px-4 py-2 text-sm font-bold text-blue-300">
                    <Clock className="h-4 w-4 text-blue-400" />
                    Time: {nowServing.time}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Guidance Advisory */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
            <p className="text-xs font-semibold text-slate-400">
              Mangyaring ihanda ang PhilSys o valid ID bago lumapit sa consultation counter.
            </p>
          </div>
        </section>

        {/* RIGHT COLUMN: 3 SPECIALIZED DEPARTMENT COLUMNS */}
        <section className="col-span-7 grid grid-cols-3 gap-5">
          {/* 1. VACCINATION */}
          <div className="flex flex-col rounded-3xl border border-emerald-900/40 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="border-b border-emerald-900/40 bg-emerald-950/40 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Syringe className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-200">
                  Vaccination
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-black text-emerald-300">
                {vaccineQueue.length}
              </span>
            </div>

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
              {vaccineQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl p-3.5 transition-all ${
                    nowServing?.queueNumber === item.queueNumber
                      ? "border-2 border-emerald-400 bg-emerald-950/60 shadow-lg scale-[1.02]"
                      : "border border-slate-800/80 bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-black text-emerald-400">
                      #{item.queueNumber}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-sm text-white truncate">
                    {item.patientName}
                  </p>
                </div>
              ))}

              {vaccineQueue.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-16">
                  <Users className="h-6 w-6 stroke-1 mb-1" />
                  <span>No patients queued</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. MEDICINE DISPENSARY */}
          <div className="flex flex-col rounded-3xl border border-amber-900/40 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="border-b border-amber-900/40 bg-amber-950/40 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-200">
                  Medicine
                </h3>
              </div>
              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-black text-amber-300">
                {medicineQueue.length}
              </span>
            </div>

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
              {medicineQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl p-3.5 transition-all ${
                    nowServing?.queueNumber === item.queueNumber
                      ? "border-2 border-amber-400 bg-amber-950/60 shadow-lg scale-[1.02]"
                      : "border border-slate-800/80 bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-black text-amber-400">
                      #{item.queueNumber}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-sm text-white truncate">
                    {item.patientName}
                  </p>
                </div>
              ))}

              {medicineQueue.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-16">
                  <Users className="h-6 w-6 stroke-1 mb-1" />
                  <span>No patients queued</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. FREE CHECK-UP */}
          <div className="flex flex-col rounded-3xl border border-cyan-900/40 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="border-b border-cyan-900/40 bg-cyan-950/40 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-cyan-200">
                  Check-up
                </h3>
              </div>
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 text-xs font-black text-cyan-300">
                {checkupQueue.length}
              </span>
            </div>

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
              {checkupQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl p-3.5 transition-all ${
                    nowServing?.queueNumber === item.queueNumber
                      ? "border-2 border-cyan-400 bg-cyan-950/60 shadow-lg scale-[1.02]"
                      : "border border-slate-800/80 bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-black text-cyan-400">
                      #{item.queueNumber}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-sm text-white truncate">
                    {item.patientName}
                  </p>
                </div>
              ))}

              {checkupQueue.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-16">
                  <Users className="h-6 w-6 stroke-1 mb-1" />
                  <span>No patients queued</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="h-10 border-t border-slate-800/60 bg-slate-950 px-8 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Barangay Kumintang Ilaya Health Station Management System</span>
        <span>Priority lanes available for senior citizens, persons with disabilities, and pregnant individuals</span>
      </footer>
    </div>
  );
}