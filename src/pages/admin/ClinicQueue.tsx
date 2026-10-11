import { useEffect, useState, useMemo, type ChangeEvent } from "react";
import { 
  Users, 
  Camera, 
  CheckCircle, 
  Clock, 
  Phone, 
  X, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";
import { appointmentService } from "../../services/appointmentService";
import type { Appointment } from "../../types/appointment";

export default function ClinicQueue() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePatient, setActivePatient] = useState<Appointment | null>(null);

  // Form states for completion modal
  const [remarks, setRemarks] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  async function loadTodayQueue() {
    try {
      setLoading(true);
      const list = await appointmentService.list();
      // Filter appointments scheduled for today
      const todayList = list.filter((a) => a.date === todayStr);
      setAppointments(todayList);
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTodayQueue();
  }, []);

  // Sort queue by assigned time (First-Come, First-Served / Chronological order)
  const confirmedQueue = useMemo(() => {
    return appointments
      .filter((a) => a.status === "Confirmed")
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [appointments]);

  const completedToday = useMemo(() => {
    return appointments.filter((a) => a.status === "Completed");
  }, [appointments]);

  const currentServing = confirmedQueue[0] || null;

  function openCompleteModal(patient: Appointment) {
    setActivePatient(patient);
    setRemarks("");
    setProofFile(null);
    setProofPreview(null);
  }

  const handleCapturePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  async function handleFinishConsultation() {
    if (!activePatient) return;
    try {
      setSubmitting(true);
      let photoUrl: string | undefined = undefined;

      if (proofFile) {
        photoUrl = await appointmentService.uploadCompletionPhoto(proofFile);
      }

      const updated = await appointmentService.completeAppointment(
        activePatient.id,
        remarks,
        photoUrl
      );

      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setActivePatient(null);
    } catch (err) {
      console.error("Failed to complete appointment:", err);
      alert("An error occurred while saving the consultation record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout
      title="Clinic Queue"
      description={`Real-time patient intake and triage tracker for ${todayStr} (8:00 AM – 5:00 PM)`}
    >
      <div className="space-y-6">
        {/* Metric Counter Badges */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-4 border-l-4 border-l-blue-600">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Remaining in Queue</p>
              <p className="font-display text-2xl font-bold text-navy-900 dark:text-white">
                {confirmedQueue.length} <span className="text-xs text-ink-400 font-normal">patient(s)</span>
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 border-l-4 border-l-emerald-600">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Completed Today</p>
              <p className="font-display text-2xl font-bold text-navy-900 dark:text-white">
                {completedToday.length}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 border-l-4 border-l-navy-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-800 dark:bg-navy-900 dark:text-white">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Total Booked for Today</p>
              <p className="font-display text-2xl font-bold text-navy-900 dark:text-white">
                {appointments.length} / 20
              </p>
            </div>
          </Card>
        </div>

        {/* NOW SERVING PRIORITY CARD */}
        {currentServing ? (
          <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 p-6 shadow-sm dark:bg-emerald-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" /> Now Serving
                </span>
                <h2 className="mt-2 text-2xl font-extrabold text-navy-900 dark:text-white">
                  {currentServing.patientName}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-ink-600 dark:text-white/70">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <Clock className="h-4 w-4" /> {currentServing.time}
                  </span>
                  <span>•</span>
                  <span>Service: <strong>{currentServing.reason}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {currentServing.contactNumber}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => openCompleteModal(currentServing)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
              >
                <CheckCircle className="h-5 w-5 mr-1" /> Complete Consultation
              </Button>
            </div>
          </div>
        ) : null}

        {/* LINEUP QUEUE LIST */}
        <Card>
          <h3 className="font-display text-lg font-bold text-navy-900 dark:text-white mb-4">
            Patient Queue Lineup
          </h3>

          {loading ? (
            <div className="flex justify-center py-12 text-ink-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : confirmedQueue.length === 0 ? (
            <div className="py-12 text-center text-ink-500 dark:text-white/40">
              <AlertCircle className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 font-medium">All patients for today have been served.</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-100 dark:divide-white/10">
              {confirmedQueue.map((patient, index) => (
                <div
                  key={patient.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-100 font-bold text-navy-800 dark:bg-white/10 dark:text-white">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-navy-900 dark:text-white">
                        {patient.patientName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-white/50">
                        <span className="font-semibold text-emerald-600">{patient.time}</span>
                        <span>•</span>
                        <span>{patient.reason}</span>
                        <span>•</span>
                        <span>Ref: {patient.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCompleteModal(patient)}
                      className="cursor-pointer"
                    >
                      <Camera className="h-4 w-4 mr-1" /> Complete & Document
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* SERVICE DOCUMENTATION & CAMERA CAPTURE MODAL */}
      <Modal
        isOpen={!!activePatient}
        onClose={() => setActivePatient(null)}
        title="Consultation & Service Documentation"
        footer={
          <div className="flex w-full justify-between gap-2">
            <Button variant="outline" onClick={() => setActivePatient(null)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleFinishConsultation} isLoading={submitting} className="cursor-pointer">
              Save & Mark Completed
            </Button>
          </div>
        }
      >
        {activePatient && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-soft p-3 dark:bg-white/5 text-sm">
              <p className="font-bold text-navy-900 dark:text-white">{activePatient.patientName}</p>
              <p className="text-xs text-ink-500">Service: {activePatient.reason} ({activePatient.time})</p>
            </div>

            <Textarea
              label="Clinical Remarks / Medication Dispensed *"
              placeholder="e.g., Dispensed 10 tablets Paracetamol 500mg; Blood pressure 120/80; advised bed rest."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required
            />

            {/* Mobile/Tablet Native Camera & Upload Trigger */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink-800 dark:text-white/90">
                Service Proof / Prescription (Capture Photo)
              </label>

              {!proofPreview ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy-200 bg-surface-soft/50 p-6 text-center hover:border-navy-500 dark:border-white/20 dark:bg-white/5">
                  <Camera className="h-8 w-8 text-navy-600 dark:text-navy-300" />
                  <span className="mt-2 text-sm font-medium text-navy-800 dark:text-white">
                    Open Camera or Upload Image
                  </span>
                  <span className="text-xs text-ink-400">Tap to launch camera on tablet or mobile device</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCapturePhoto}
                  />
                </label>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-navy-200 dark:border-white/20">
                  <img src={proofPreview} alt="Captured consultation proof" className="max-h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setProofFile(null); setProofPreview(null); }}
                    className="absolute top-2 right-2 rounded-lg bg-red-600 p-1 text-white hover:bg-red-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}