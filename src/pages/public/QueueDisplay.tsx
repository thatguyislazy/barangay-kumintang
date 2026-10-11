import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Users,
  Syringe,
  Pill,
  Stethoscope,
  Sparkles,
  Radio,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../../supabase/supabase";
import { voiceService } from "../../services/voiceService";
import barangaySeal from "../../assets/logo/barangay-seal.png";
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

  // Live Digital Clock & Date
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

          // Visual strobe animation sa TV
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
    <div className="flex min-h-screen w-full flex-col bg-slate-950 font-sans text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* RESPONSIVE HEADER BAR WITH LOGO */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-md sm:px-8 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 p-1.5 shadow-lg shadow-blue-500/10 ring-1 ring-white/10 sm:h-14 sm:w-14">
            <img
              src={barangaySeal}
              alt="Barangay Kumintang Ilaya Seal"
              className="h-full w-full object-contain drop-shadow"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-black uppercase tracking-wider text-white sm:text-2xl">
                Barangay Kumintang Ilaya
              </h1>
              <span className="hidden items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-blue-500/30 md:inline-flex">
                <ShieldCheck className="h-3 w-3" /> Official
              </span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400 sm:text-xs">
              Community Health Center • Live Triage Display
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Audio Activator Button */}
          <button
            onClick={() => setAudioEnabled((prev) => !prev)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 sm:px-5 sm:py-2.5 ${
              audioEnabled
                ? "bg-emerald-600 text-white shadow-emerald-950/40 hover:bg-emerald-500"
                : "bg-amber-500 text-slate-950 shadow-amber-500/30 animate-pulse hover:bg-amber-400"
            }`}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="h-4 w-4" />
                <span className="hidden sm:inline">TV Audio Active</span>
                <span className="sm:hidden">Audio On</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4" />
                <span className="hidden sm:inline">Enable TV Audio</span>
                <span className="sm:hidden">Muted</span>
              </>
            )}
          </button>

          <div className="flex flex-col items-end border-l border-slate-800 pl-3 sm:pl-5">
            <span className="font-mono text-lg font-black tracking-tight text-white sm:text-2xl">
              {currentTime || "--:--:--"}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 sm:text-[11px]">
              {currentDate}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN RESPONSIVE CONTENT AREA */}
      <main className="grid flex-1 grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12 lg:gap-6">
        {/* LEFT / TOP JUMBOTRON CARD: NOW SERVING */}
        <section
          className={`flex flex-col justify-between rounded-3xl border p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-500 lg:col-span-5 sm:p-8 ${
            flashingId
              ? "border-blue-400 bg-gradient-to-b from-blue-900/90 via-slate-900 to-slate-950 ring-4 ring-blue-500/40"
              : "border-blue-500/30 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-blue-950/30"
          }`}
        >
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          {/* Top Pill Status */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-300">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              Now Serving At Counter
            </span>
            <span className="text-xs font-bold text-slate-400">
              In Line: <strong className="text-white">{queue.length}</strong>
            </span>
          </div>

          {/* Ticket Number & Patient Details */}
          <div className="my-auto py-8 text-center sm:py-12">
            <div className="inline-block rounded-3xl bg-blue-600/20 border-2 border-blue-500/40 px-10 py-4 shadow-[0_0_50px_rgba(37,99,235,0.25)] sm:px-14 sm:py-6">
              <span className="font-mono text-7xl font-black tracking-tighter text-blue-400 drop-shadow-[0_0_40px_rgba(59,130,246,0.6)] sm:text-8xl md:text-9xl">
                {nowServing ? `#${nowServing.queueNumber}` : "--"}
              </span>
            </div>

            <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight sm:text-4xl md:text-5xl line-clamp-2">
              {nowServing ? nowServing.patientName : "Waiting for Next Patient..."}
            </h2>

            {nowServing && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 px-4 py-2 text-xs sm:text-sm font-bold text-slate-200">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  {nowServing.reason}
                </span>
                {nowServing.time && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 px-4 py-2 text-xs sm:text-sm font-bold text-blue-300">
                    <Clock className="h-4 w-4 text-blue-400" />
                    Slot: {nowServing.time}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom Prompt */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
            <p className="text-xs font-semibold text-slate-400">
              Ihanda ang PhilSys o valid ID bago lumapit sa consultation counter.
            </p>
          </div>
        </section>

        {/* RIGHT SECTION: 3 SERVICE DEPARTMENT COLUMNS */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:col-span-7">
          {/* 1. VACCINATION */}
          <div className="flex min-h-[300px] flex-col rounded-3xl border border-emerald-900/40 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
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

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[520px]">
              {vaccineQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl p-3.5 transition-all ${
                    nowServing?.queueNumber === item.queueNumber
                      ? "border-2 border-emerald-400 bg-emerald-950/60 shadow-lg scale-[1.02]"
                      : "border border-slate-800/80 bg-slate-950/50 hover:border-slate-700"
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
          <div className="flex min-h-[300px] flex-col rounded-3xl border border-amber-900/40 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
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

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[520px]">
              {medicineQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl p-3.5 transition-all ${
                    nowServing?.queueNumber === item.queueNumber
                      ? "border-2 border-amber-400 bg-amber-950/60 shadow-lg scale-[1.02]"
                      : "border border-slate-800/80 bg-slate-950/50 hover:border-slate-700"
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
          <div className="flex min-h-[300px] flex-col rounded-3xl border border-cyan-900/40 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
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

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[520px]">
              {checkupQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl p-3.5 transition-all ${
                    nowServing?.queueNumber === item.queueNumber
                      ? "border-2 border-cyan-400 bg-cyan-950/60 shadow-lg scale-[1.02]"
                      : "border border-slate-800/80 bg-slate-950/50 hover:border-slate-700"
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

      {/* RESPONSIVE FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 bg-slate-950 px-4 py-2.5 text-xs font-medium text-slate-500 sm:px-8">
        <span>Barangay Kumintang Ilaya Health Station Management System</span>
        <span className="text-[11px] text-slate-600 sm:text-xs">
          Priority lanes available for senior citizens, PWDs, and pregnant individuals
        </span>
      </footer>
    </div>
  );
}