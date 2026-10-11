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
  const [activeCall, setActiveCall] = useState<{
    queueNumber: number;
    patientName: string;
    reason: string;
  } | null>(null);

  // Digital Clock & Date
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

  // Fetch today's confirmed appointments
  const fetchAppointments = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", today)
      .eq("status", "Confirmed");

    if (error) {
      console.error("QueueDisplay: Error loading queue:", error.message);
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

  // Realtime Data Sync + Broadcast Audio Listener
  useEffect(() => {
    fetchAppointments();

    const dbChannel = supabase
      .channel("public:appointments_queue_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    // Broadcast Listener: Dito lang mag-sasalita ang audio kapag pinindot sa admin
    const broadcastChannel = supabase
      .channel("clinic_audio_broadcast")
      .on("broadcast", { event: "CALL_PATIENT" }, (payload) => {
        const item = payload.payload;
        if (item) {
          setActiveCall({
            queueNumber: item.queueNumber,
            patientName: item.patientName,
            reason: item.reason,
          });

          if (audioEnabled) {
            const speech = `Calling Queue Number ${item.queueNumber}, ${item.patientName}, for ${item.reason}. Please proceed to the clinic counter.`;
            voiceService.speak(speech);
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
      {/* HEADER BAR */}
      <header className="flex h-20 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 shadow-lg shadow-blue-500/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white">
              Barangay Kumintang Ilaya
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Community Health Center • Live Triage Display
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => setAudioEnabled((prev) => !prev)}
            className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg ${
              audioEnabled
                ? "bg-emerald-600/90 text-white shadow-emerald-900/30 hover:bg-emerald-500"
                : "bg-amber-500 text-slate-950 shadow-amber-500/20 animate-pulse hover:bg-amber-400"
            }`}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="h-4 w-4" /> Sound Active
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4" /> Click To Enable TV Voice
              </>
            )}
          </button>

          <div className="flex flex-col items-end border-l border-slate-800 pl-5">
            <span className="font-mono text-2xl font-black tracking-tight text-white">
              {currentTime || "--:--:--"}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {currentDate}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN DUAL VIEW */}
      <main className="grid flex-1 grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* LEFT SECTION (5 Cols): NOW SERVING HIGHLIGHT */}
        <section className="col-span-5 flex flex-col justify-between rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-blue-950/40 p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          {/* Top Tag */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-blue-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              Now Serving At Counter
            </span>
            <span className="text-xs font-bold text-slate-400">
              Total Today: {queue.length}
            </span>
          </div>

          {/* Center Callout */}
          <div className="my-auto text-center py-6">
            <div className="inline-block rounded-3xl bg-blue-600/20 border border-blue-500/40 px-10 py-4 shadow-inner">
              <span className="font-mono text-8xl font-black tracking-tighter text-blue-400 drop-shadow-[0_0_35px_rgba(59,130,246,0.5)]">
                {nowServing ? `#${nowServing.queueNumber}` : "--"}
              </span>
            </div>

            <h2 className="mt-8 text-4xl font-extrabold text-white tracking-tight line-clamp-2">
              {nowServing ? nowServing.patientName : "Waiting For Next Call"}
            </h2>

            {nowServing && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700/60 px-5 py-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-slate-200">
                  {nowServing.reason}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Announcement Note */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
            <p className="text-xs font-medium text-slate-400">
              Please listen for your name and queue number. Present your PhilSys or valid ID when approaching the counter.
            </p>
          </div>
        </section>

        {/* RIGHT SECTION (7 Cols): 3 SERVICE DEPARTMENT COLUMNS */}
        <section className="col-span-7 grid grid-cols-3 gap-5">
          {/* 1. VACCINATION */}
          <div className="flex flex-col rounded-3xl border border-emerald-900/40 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="border-b border-emerald-900/40 bg-emerald-950/30 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Syringe className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-200">
                  Vaccine
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
                      ? "border border-emerald-500 bg-emerald-950/40 shadow-lg"
                      : "border border-slate-800/80 bg-slate-950/40"
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
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-12">
                  <Users className="h-6 w-6 stroke-1 mb-1" />
                  <span>No patients in line</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. MEDICINE DISPENSARY */}
          <div className="flex flex-col rounded-3xl border border-amber-900/40 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="border-b border-amber-900/40 bg-amber-950/30 px-5 py-4 flex items-center justify-between">
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
                      ? "border border-amber-500 bg-amber-950/40 shadow-lg"
                      : "border border-slate-800/80 bg-slate-950/40"
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
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-12">
                  <Users className="h-6 w-6 stroke-1 mb-1" />
                  <span>No patients in line</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. FREE CHECK-UP */}
          <div className="flex flex-col rounded-3xl border border-cyan-900/40 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="border-b border-cyan-900/40 bg-cyan-950/30 px-5 py-4 flex items-center justify-between">
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
                      ? "border border-cyan-500 bg-cyan-950/40 shadow-lg"
                      : "border border-slate-800/80 bg-slate-950/40"
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
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-12">
                  <Users className="h-6 w-6 stroke-1 mb-1" />
                  <span>No patients in line</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="h-10 border-t border-slate-800/60 bg-slate-950 px-8 flex items-center justify-between text-xs text-slate-500">
        <span>Barangay Kumintang Ilaya Health Station Management System</span>
        <span>Senior citizens, PWDs, and pregnant women receive priority triage care</span>
      </footer>
    </div>
  );
}