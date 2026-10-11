import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent, type FormEvent } from "react";
import {
  Users,
  Megaphone,
  Camera,
  Upload,
  Loader2,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Clock,
  Phone,
  FileText,
  Video,
  VideoOff,
  RotateCcw,
  AlertCircle,
  Pill,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { appointmentService, type MedicineItem } from "../../services/appointmentService";
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

function base64ToFile(dataURI: string, filename: string): File {
  const parts = dataURI.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const binaryString = atob(parts[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new File([bytes], filename, { type: mime, lastModified: Date.now() });
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
  const [formError, setFormError] = useState<string | null>(null);

  // Medicine Inventory State
  const [medicinesList, setMedicinesList] = useState<MedicineItem[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>("");
  const [dispenseQuantity, setDispenseQuantity] = useState<number>(1);

  // Camera & File States
  const [captureMode, setCaptureMode] = useState<"upload" | "webcam">("upload");
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const loadMedicines = useCallback(async () => {
    try {
      const data = await appointmentService.listMedicines();
      setMedicinesList(data);
    } catch (err) {
      console.error("ClinicQueue: Error loading medicines:", err);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadMedicines();

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
  }, [loadAppointments, loadMedicines]);

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

  const isMedicineAppointment = useMemo(() => {
    if (!selectedAppointment) return false;
    const r = (selectedAppointment.reason || "").toLowerCase();
    return r.includes("medicin") || r.includes("gamot") || r.includes("pharmac") || r.includes("prescri");
  }, [selectedAppointment]);

  const selectedMedicine = useMemo(() => {
    return medicinesList.find((m) => m.id === selectedMedicineId) || null;
  }, [medicinesList, selectedMedicineId]);

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

  const loadVideoDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        const usbCamera = videoInputs.find(
          (d) => !d.label.toLowerCase().includes("integrated") && !d.label.toLowerCase().includes("built-in")
        );
        setSelectedDeviceId(usbCamera ? usbCamera.deviceId : videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Error enumerating video devices:", err);
    }
  };

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startWebcam = async (deviceIdToUse?: string) => {
    setCameraError(null);
    stopWebcam();

    const targetDeviceId = deviceIdToUse || selectedDeviceId;

    try {
      const constraints: MediaStreamConstraints = {
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      await loadVideoDevices();
      setIsCameraActive(true);
    } catch (err) {
      console.error("Webcam access error:", err);
      setCameraError("Cannot access camera. Check device permissions or webcam connection.");
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      const videoEl = videoRef.current;
      videoEl.srcObject = streamRef.current;
      videoEl.onloadedmetadata = () => {
        videoEl.play().catch((playErr) => console.warn("Video play error:", playErr));
      };
    }
  }, [isCameraActive]);

  const handleCaptureFromWebcam = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert("Camera feed not ready yet. Please wait a second.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setProofPreview(dataUrl);

      const realFile = base64ToFile(dataUrl, `webcam_${Date.now()}.jpg`);
      setProofFile(realFile);
      setFormError(null);
      stopWebcam();
    } catch (err: any) {
      console.error("Error creating image file from canvas:", err);
      alert("Failed to process photo: " + err.message);
    }
  };

  const handleOpenCompleteModal = (item: Appointment) => {
    setSelectedAppointment(item);
    setRemarks("");
    setProofFile(null);
    setProofPreview("");
    setFormError(null);
    setSelectedMedicineId("");
    setDispenseQuantity(1);
    setCaptureMode("upload");
    setCameraError(null);
    loadMedicines();
  };

  const handleCloseModal = () => {
    if (isSubmittingCompletion) return;
    stopWebcam();
    setSelectedAppointment(null);
    setFormError(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setFormError(null);
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

    if (!proofFile) {
      setFormError("Procedure proof photo is required. Please capture via camera or attach a file.");
      return;
    }

    if (selectedMedicineId) {
      if (!selectedMedicine) {
        setFormError("Selected medicine is invalid.");
        return;
      }
      if (dispenseQuantity <= 0) {
        setFormError("Dispense quantity must be greater than 0.");
        return;
      }
      if (dispenseQuantity > selectedMedicine.stock_quantity) {
        setFormError(`Insufficient stock for ${selectedMedicine.name}. Available: ${selectedMedicine.stock_quantity}`);
        return;
      }
    }

    try {
      setIsSubmittingCompletion(true);
      setFormError(null);

      const proofUrl = await appointmentService.uploadCompletionPhoto(proofFile);

      const dispensePayload = selectedMedicineId && selectedMedicine ? {
        medicineId: selectedMedicine.id,
        quantity: dispenseQuantity,
        medicineName: `${selectedMedicine.name} (${selectedMedicine.dosage})`,
      } : undefined;

      await appointmentService.completeAppointment(
        selectedAppointment.id,
        remarks.trim(),
        proofUrl,
        dispensePayload
      );

      stopWebcam();
      setSelectedAppointment(null);
      await loadAppointments();
      await loadMedicines();
    } catch (err: any) {
      console.error("Error completing consultation:", err);
      setFormError(err?.message || "Failed to finalize consultation records. Please try again.");
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
              Clinic Live Queue Triage
            </h1>
            <p className="text-sm text-ink-500 dark:text-white/60">
              Active consultations for today ({todayStr}) • {todayQueue.length} patient(s) waiting
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
              onClick={handleCloseModal}
            />
            <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-navy-900 border border-navy-100 dark:border-white/10 max-h-[92vh] overflow-y-auto">
              <h2 className="font-display text-xl font-bold text-navy-900 dark:text-white">
                Finalize Consultation - {selectedAppointment.patientName}
              </h2>
              <p className="mt-1 text-xs text-ink-500 dark:text-white/60">
                Ticket: {selectedAppointment.id} • Service: {selectedAppointment.reason}
              </p>

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCompleteConsultation} className="mt-4 space-y-4">
                {/* MEDICINE INVENTORY DISPENSING */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                    <Pill className="h-4 w-4" />
                    Dispense Medicine from Stock {isMedicineAppointment ? "(Recommended)" : "(Optional)"}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-ink-600 dark:text-white/70 mb-1">
                        Select Medicine
                      </label>
                      <select
                        value={selectedMedicineId}
                        onChange={(e) => setSelectedMedicineId(e.target.value)}
                        className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs text-navy-900 outline-none focus:border-blue-500 dark:border-white/15 dark:bg-navy-800 dark:text-white"
                      >
                        <option value="">-- No medicine dispensed --</option>
                        {medicinesList.map((med) => (
                          <option
                            key={med.id}
                            value={med.id}
                            disabled={med.stock_quantity <= 0}
                          >
                            {med.name} {med.dosage ? `(${med.dosage})` : ""} - Stock: {med.stock_quantity} {med.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink-600 dark:text-white/70 mb-1">
                        Quantity ({selectedMedicine?.unit || "units"})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={selectedMedicine?.stock_quantity || 100}
                        value={dispenseQuantity}
                        onChange={(e) => setDispenseQuantity(parseInt(e.target.value, 10) || 1)}
                        disabled={!selectedMedicineId}
                        className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs text-navy-900 outline-none focus:border-blue-500 dark:border-white/15 dark:bg-navy-800 dark:text-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {selectedMedicine && (
                    <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                      Remaining stock after deduction: <strong>{Math.max(0, selectedMedicine.stock_quantity - dispenseQuantity)} {selectedMedicine.unit}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Clinical Remarks & Prescriptions Given <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter diagnosis, instructions, or doctor remarks..."
                    className="mt-1.5 w-full rounded-xl border border-navy-200 bg-white p-3 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </div>

                {/* Procedure Proof Photo (Required) */}
                <div>
                  <div className="flex items-center justify-between pb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                      Procedure Proof Photo <span className="text-red-500 font-bold">* (Required)</span>
                    </label>
                    <div className="inline-flex rounded-lg border border-navy-200 bg-navy-50 p-0.5 dark:border-white/10 dark:bg-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          stopWebcam();
                          setCaptureMode("upload");
                        }}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          captureMode === "upload"
                            ? "bg-white text-navy-900 shadow-sm dark:bg-navy-800 dark:text-white"
                            : "text-ink-500 hover:text-navy-900 dark:text-white/60"
                        }`}
                      >
                        <Upload className="h-3 w-3" />
                        Attach File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCaptureMode("webcam");
                          startWebcam();
                        }}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          captureMode === "webcam"
                            ? "bg-white text-navy-900 shadow-sm dark:bg-navy-800 dark:text-white"
                            : "text-ink-500 hover:text-navy-900 dark:text-white/60"
                        }`}
                      >
                        <Camera className="h-3 w-3" />
                        Laptop/USB Cam
                      </button>
                    </div>
                  </div>

                  {captureMode === "upload" && (
                    <div className="mt-2">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-navy-300 p-4 text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/5 transition-colors">
                        <Upload className="h-4 w-4 text-blue-600" />
                        <span>Click to attach procedure photo from device</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  )}

                  {captureMode === "webcam" && (
                    <div className="mt-2 space-y-2">
                      {videoDevices.length > 1 && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-ink-600 dark:text-white/70">
                            Camera:
                          </label>
                          <select
                            value={selectedDeviceId}
                            onChange={(e) => {
                              const newId = e.target.value;
                              setSelectedDeviceId(newId);
                              startWebcam(newId);
                            }}
                            className="flex-1 rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs text-navy-900 outline-none dark:border-white/15 dark:bg-navy-800 dark:text-white"
                          >
                            {videoDevices.map((dev, i) => (
                              <option key={dev.deviceId || i} value={dev.deviceId}>
                                {dev.label || `Camera ${i + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {cameraError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/20">
                          {cameraError}
                          <button
                            type="button"
                            onClick={() => startWebcam()}
                            className="ml-2 font-bold underline cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      ) : isCameraActive ? (
                        <div className="relative overflow-hidden rounded-2xl bg-black">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-52 w-full object-cover"
                          />
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleCaptureFromWebcam}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500 cursor-pointer active:scale-95"
                            >
                              <Camera className="h-4 w-4" />
                              Snap Photo
                            </button>
                            <button
                              type="button"
                              onClick={stopWebcam}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 cursor-pointer"
                            >
                              <VideoOff className="h-3.5 w-3.5" />
                              Turn Off
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startWebcam()}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-400 p-4 text-sm font-semibold text-blue-600 hover:bg-blue-50/50 dark:border-blue-500/40 dark:text-blue-400 dark:hover:bg-blue-950/20 cursor-pointer"
                        >
                          <Video className="h-4 w-4" />
                          Start Webcam / USB Camera Preview
                        </button>
                      )}
                    </div>
                  )}

                  {proofPreview && (
                    <div className="mt-3 relative rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-800/50">
                      <img
                        src={proofPreview}
                        alt="Captured proof"
                        className="h-36 w-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                        ✓ Procedure Proof Ready
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview("");
                          if (captureMode === "webcam") startWebcam();
                        }}
                        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-red-600/90 px-2.5 py-1 text-xs font-bold text-white shadow hover:bg-red-500 cursor-pointer backdrop-blur-sm"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retake / Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-navy-100 dark:border-white/10">
                  <button
                    type="button"
                    disabled={isSubmittingCompletion}
                    onClick={handleCloseModal}
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
                    {isSubmittingCompletion ? "Saving & Deducting Stock..." : "Mark as Completed"}
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