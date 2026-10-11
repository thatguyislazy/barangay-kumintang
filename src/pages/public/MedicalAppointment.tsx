import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, HeartPulse, Upload, FileCheck, X, AlertOctagon, Loader2 } from "lucide-react";
import { Navbar } from "../../components/public/Navbar";
import { Footer } from "../../components/public/Footer";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { appointmentService, MAX_APPOINTMENT_CAPACITY } from "../../services/appointmentService";
import { barangayConfig } from "../../config/barangay";
import type { AppointmentFormData, AppointmentReason } from "../../types/appointment";

const REASON_OPTIONS: AppointmentReason[] = [
  "Medicine",
  "Free Check-up",
  "Vaccination",
];

const initialForm: AppointmentFormData = {
  patientName: "",
  contactNumber: "",
  barangay: barangayConfig.shortName,
  reason: "",
  notes: "",
};

type Errors = Partial<Record<keyof AppointmentFormData | "idPhoto", string>>;

export default function MedicalAppointment() {
  const [form, setForm] = useState<AppointmentFormData>(initialForm);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  // Capacity states
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(true);
  const [isCapacityFull, setIsCapacityFull] = useState(false);
  const [intakeCount, setIntakeCount] = useState(0);

  // Check intake capacity from Supabase on mount
  useEffect(() => {
    async function checkCapacity() {
      try {
        setIsCheckingCapacity(true);
        const count = await appointmentService.getDailyIntakeCount();
        setIntakeCount(count);
        setIsCapacityFull(count >= MAX_APPOINTMENT_CAPACITY);
      } catch (err) {
        console.error("Failed to check intake count:", err);
      } finally {
        setIsCheckingCapacity(false);
      }
    }

    checkCapacity();
  }, []);

  function update<K extends keyof AppointmentFormData>(key: K, value: AppointmentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const handleIdFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, idPhoto: "File size must be under 5MB." }));
      return;
    }

    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, idPhoto: undefined }));
  };

  const removeIdFile = () => {
    setIdFile(null);
    if (idPreview) URL.revokeObjectURL(idPreview);
    setIdPreview(null);
  };

  function validate(): boolean {
    const next: Errors = {};
    if (!form.patientName.trim()) next.patientName = "Patient name is required.";
    if (!form.contactNumber.trim()) next.contactNumber = "Contact number is required.";
    else if (!/^[\d\s+()-]{7,}$/.test(form.contactNumber))
      next.contactNumber = "Enter a valid contact number.";
    if (!form.barangay.trim()) next.barangay = "Barangay is required.";
    if (!form.reason) next.reason = "Please choose a reason for the appointment.";
    if (!idFile) next.idPhoto = "PhilSys or Government ID is required for residency verification.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isCapacityFull || !validate()) return;
    setIsSubmitting(true);
    try {
      let uploadedUrl: string | undefined = undefined;
      if (idFile) {
        uploadedUrl = await appointmentService.uploadIdPhoto(idFile);
      }

      const created = await appointmentService.create({
        ...form,
        idPhotoUrl: uploadedUrl,
      });
      setConfirmedId(created.id);
    } catch (err: unknown) {
      console.error("Failed to submit appointment:", err);
      const msg = err instanceof Error ? err.message : "Failed to submit appointment.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-off dark:bg-navy-950">
      <Navbar />
      <main className="container-page py-14 lg:py-20">
        <Link
          to="/#services"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-navy-700 dark:text-white/50 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Services
        </Link>

        <div className="mx-auto mt-6 max-w-2xl">
          {confirmedId ? (
            <Card className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-bold text-navy-900 dark:text-white">
                Appointment Request Submitted
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600 dark:text-white/60">
                Your request and proof of residency have been received. The barangay health staff
                will verify your PhilSys ID and contact you with your assigned schedule. Reference number{" "}
                <span className="font-semibold text-navy-800 dark:text-white">
                  {confirmedId}
                </span>.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmedId(null);
                    setForm(initialForm);
                    removeIdFile();
                  }}
                >
                  Submit Another Request
                </Button>
                <Link to="/">
                  <Button fullWidth>Return to Homepage</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="mb-7 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white dark:bg-navy-500">
                    <HeartPulse className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="font-display text-xl font-bold text-navy-900 dark:text-white">
                      Medical Appointment Request
                    </h1>
                    <p className="text-sm text-ink-500 dark:text-white/50">
                      Submit resident details. The Barangay admin will review and assign your schedule.
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Loading Indicator */}
              {isCheckingCapacity ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking slot availability...
                </div>
              ) : isCapacityFull ? (
                /* LOCKED FORM NOTICE BANNER */
                <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/40">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                    <AlertOctagon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-3 font-display text-lg font-bold text-rose-900 dark:text-rose-200">
                    Daily Appointment Limit Reached
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-rose-700 dark:text-rose-300">
                    All available appointment slots for today ({intakeCount}/{MAX_APPOINTMENT_CAPACITY}) are currently full.
                    New requests are temporarily locked to allow health staff to review pending residents.
                  </p>
                  <p className="mt-4 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Please visit the Barangay Health Center in person or check back tomorrow morning.
                  </p>
                </div>
              ) : (
                /* ACTIVE SUBMISSION FORM */
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <Input
                    label="Patient Name"
                    placeholder="Juan Dela Cruz"
                    value={form.patientName}
                    onChange={(e) => update("patientName", e.target.value)}
                    error={errors.patientName}
                    required
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Contact Number"
                      placeholder="0917 123 4567"
                      value={form.contactNumber}
                      onChange={(e) => update("contactNumber", e.target.value)}
                      error={errors.contactNumber}
                      required
                    />
                    <Input
                      label="Barangay"
                      value={form.barangay}
                      onChange={(e) => update("barangay", e.target.value)}
                      error={errors.barangay}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-ink-800 dark:text-white/90">
                      Reason for Appointment *
                    </label>
                    <select
                      value={form.reason}
                      onChange={(e) => update("reason", e.target.value as AppointmentReason)}
                      className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-navy-900 dark:text-white cursor-pointer"
                      required
                    >
                      <option value="">Select reason...</option>
                      {REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {errors.reason && (
                      <p className="text-xs font-medium text-accent-red dark:text-red-400">
                        {errors.reason}
                      </p>
                    )}
                  </div>

                  {/* PhilSys ID Proof Uploader */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-ink-800 dark:text-white/90">
                      Proof of Residency (PhilSys / Barangay ID / Valid ID) *
                    </label>
                    <p className="text-xs text-ink-500 dark:text-white/50">
                      Upload a photo of your ID confirming your residency in Barangay Kumintang Ilaya.
                    </p>

                    {!idPreview ? (
                      <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy-200 bg-surface-soft/50 p-6 text-center transition-colors hover:border-navy-500 dark:border-white/20 dark:bg-white/5">
                        <Upload className="h-8 w-8 text-ink-400 dark:text-white/40" />
                        <span className="mt-2 text-sm font-medium text-navy-800 dark:text-white">
                          Click to upload PhilSys or Government ID
                        </span>
                        <span className="mt-0.5 text-xs text-ink-400 dark:text-white/40">
                          PNG, JPG, or WEBP (Max 5MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleIdFileChange}
                        />
                      </label>
                    ) : (
                      <div className="relative mt-2 overflow-hidden rounded-2xl border border-navy-200 dark:border-white/20">
                        <img
                          src={idPreview}
                          alt="ID Preview"
                          className="h-44 w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-navy-950/80 via-transparent p-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                            <FileCheck className="h-4 w-4 text-emerald-400" />
                            {idFile?.name}
                          </span>
                          <button
                            type="button"
                            onClick={removeIdFile}
                            className="rounded-lg bg-red-600/90 p-1.5 text-white hover:bg-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {errors.idPhoto && (
                      <p className="text-xs font-medium text-accent-red dark:text-red-400">
                        {errors.idPhoto}
                      </p>
                    )}
                  </div>

                  <Textarea
                    label="Additional Notes"
                    placeholder="Optional — specify symptoms or specific medicine needed"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    hint="Optional"
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    {isSubmitting ? "Uploading ID & Submitting..." : "Submit Appointment Request"}
                  </Button>
                </form>
              )}
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}