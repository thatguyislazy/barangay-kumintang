import { useEffect, useState, useMemo, useRef } from "react";
import { Syringe, Stethoscope, Pill, Clock, Volume2, VolumeX, Sparkles, BellRing } from "lucide-react";
import { supabase } from "../../supabase/supabase";
import { appointmentService } from "../../services/appointmentService";
import { barangayConfig } from "../../config/barangay";
import { announceNumber } from "../../services/voiceService";
import type { Appointment } from "../../types/appointment";

export default function QueueDisplay() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const lastAnnouncedIdRef = useRef<string>("");

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadTodayQueue() {
    try {
      const list = await appointmentService.list();
      const todayList = list.filter((a) => a.date === todayStr);
      setAppointments(todayList);
    } catch (err) {
      console.error("Queue display fetch error:", err);
    }
  }

  // 1. Unified clinic queue: Confirmed patients ordered strictly chronologically by time slot
  const overallQueue = useMemo(() => {
    return appointments
      .filter((a) => a.status === "Confirmed" && Boolean(a.time))
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
      .map((patient, index) => ({
        ...patient,
        globalQueueNumber: index + 1,
      }));
  }, [appointments]);

  // Top priority patient across the entire health center
  const currentNowServing = overallQueue[0] || null;

  // Unlocks browser audio context directly using the active Now Serving patient
  const enableAudioManually = () => {
    setHasInteracted(true);
    setIsAudioEnabled(true);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
    if (currentNowServing) {
      lastAnnouncedIdRef.current = currentNowServing.id;
      announceNumber(
        currentNowServing.reason,
        currentNowServing.id,
        currentNowServing.patientName
      );
    }
  };

  useEffect(() => {
    const handleFirstClick = () => {
      setHasInteracted(true);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
    };

    window.addEventListener("click", handleFirstClick);
    window.addEventListener("keydown", handleFirstClick);

    return () => {
      window.removeEventListener("click", handleFirstClick);
      window.removeEventListener("keydown", handleFirstClick);
    };
  }, []);

  // Supabase Realtime subscription with a 3-second background polling fallback
  useEffect(() => {
    loadTodayQueue();

    const channel = supabase
      .channel("public:appointments:queue-monitor")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          loadTodayQueue();
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      loadTodayQueue();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  // Filter into the 3 columns while preserving global queue rank and time
  const vaccineQueue = useMemo(
    () => overallQueue.filter((a) => a.reason.toLowerCase().includes("vaccin")),
    [overallQueue]
  );

  const medicineQueue = useMemo(
    () => overallQueue.filter((a) => a.reason.toLowerCase().includes("med")),
    [overallQueue]
  );

  const checkupQueue = useMemo(
    () => overallQueue.filter((a) => a.reason.toLowerCase().includes("check")),
    [overallQueue]
  );

  // Automated voice call whenever a patient moves up to the #1 Now Serving spot
  useEffect(() => {
    if (!isAudioEnabled || !currentNowServing) return;

    if (currentNowServing.id !== lastAnnouncedIdRef.current) {
      lastAnnouncedIdRef.current = currentNowServing.id;
      announceNumber(
        currentNowServing.reason,
        currentNowServing.id,
        currentNowServing.patientName
      );
    }
  }, [currentNowServing, isAudioEnabled]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100 select-none">
      {/* Audio permission unlock banner */}
      {!hasInteracted && (
        <div
          onClick={enableAudioManually}
          className="flex cursor-pointer items-center justify-center gap-2 bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-md animate-pulse"
        >
          <BellRing className="h-4 w-4" />
          <span>Click anywhere to activate automated voice announcements</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <img
            src={barangayConfig.logo}
            alt="Barangay Seal"
            className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-700"
          />
          <div>
            <h1 className="font-display text-lg font-bold tracking-wide text-white uppercase">
              {barangayConfig.name}
            </h1>
            <p className="text-xs font-medium text-slate-400">
              Barangay Health Center • Patient Queue Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => setIsAudioEnabled((prev) => !prev)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wider transition cursor-pointer border ${
              isAudioEnabled
                ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
                : "border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {isAudioEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span>Voice: Active</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-slate-400" />
                <span>Voice: Muted</span>
              </>
            )}
          </button>

          <div className="text-right">
            <div className="font-mono text-2xl font-bold tracking-tight text-white">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
        {/* NOW SERVING CARD */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md sm:p-7">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <Sparkles className="h-3.5 w-3.5" />
                Now Serving
              </div>

              {currentNowServing ? (
                <div className="mt-3">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="font-mono text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                      {currentNowServing.id}
                    </span>
                    <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold tracking-wider text-slate-300 uppercase">
                      {currentNowServing.reason}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xl font-semibold text-slate-200">
                    {currentNowServing.patientName}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <span className="font-mono text-3xl font-bold text-slate-600">NO ACTIVE QUEUE</span>
                  <p className="text-xs text-slate-500">All scheduled patients for today have been catered.</p>
                </div>
              )}
            </div>

            {currentNowServing && (
              <div className="flex flex-col items-center sm:items-end">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scheduled Time</span>
                <span className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-bold text-emerald-400">
                  <Clock className="h-5 w-5" />
                  {currentNowServing.time}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3 COLUMNS: VACCINE, MEDICINE, FREE CHECK-UP */}
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
          {/* COLUMN 1: VACCINE */}
          <QueueColumn
            title="Vaccine"
            icon={<Syringe className="h-5 w-5 text-slate-400" />}
            queue={vaccineQueue}
            nowServingId={currentNowServing?.id}
          />

          {/* COLUMN 2: MEDICINE */}
          <QueueColumn
            title="Medicine"
            icon={<Pill className="h-5 w-5 text-slate-400" />}
            queue={medicineQueue}
            nowServingId={currentNowServing?.id}
          />

          {/* COLUMN 3: FREE CHECK-UP */}
          <QueueColumn
            title="Free Check-up"
            icon={<Stethoscope className="h-5 w-5 text-slate-400" />}
            queue={checkupQueue}
            nowServingId={currentNowServing?.id}
          />
        </div>
      </main>

      {/* Footer Ticker */}
      <footer className="border-t border-slate-800 bg-slate-900/60 px-8 py-3 text-center text-xs text-slate-400">
        Please present your PhilSys or valid government ID when called. Clinic Hours: 8:00 AM – 5:00 PM.
      </footer>
    </div>
  );
}

interface EnrichedAppointment extends Appointment {
  globalQueueNumber: number;
}

interface QueueColumnProps {
  title: string;
  icon: React.ReactNode;
  queue: EnrichedAppointment[];
  nowServingId?: string;
}

function QueueColumn({ title, icon, queue, nowServingId }: QueueColumnProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border border-slate-800 bg-slate-800/60 p-2">{icon}</div>
          <h2 className="font-display text-base font-semibold tracking-wide text-white">{title}</h2>
        </div>
        <span className="rounded-md border border-slate-800 bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-400">
          {queue.length} in queue
        </span>
      </div>

      <div className="mt-4 flex flex-1 flex-col space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
        {queue.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16 text-center text-xs text-slate-600 italic">
            No patients waiting for this service
          </div>
        ) : (
          queue.map((patient) => {
            const isCurrentlyServing = patient.id === nowServingId;
            return (
              <div
                key={patient.id}
                className={`flex items-center justify-between rounded-xl border p-3 transition ${
                  isCurrentlyServing
                    ? "border-emerald-500/60 bg-emerald-950/30 text-white shadow-sm"
                    : "border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                      isCurrentlyServing
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    #{patient.globalQueueNumber}
                  </span>

                  <div>
                    <div className="font-mono text-base font-bold tracking-tight text-white">
                      {patient.id}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[130px]">
                      {patient.patientName}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block font-mono text-xs text-slate-400">{patient.time}</span>
                  {isCurrentlyServing && (
                    <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                      Serving
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}