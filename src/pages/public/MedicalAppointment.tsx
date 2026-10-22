import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Upload,
  FileCheck,
  X,
  AlertOctagon,
  Loader2,
  User,
  MapPin,
  Stethoscope,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Navbar } from "../../components/public/Navbar";
import { Footer } from "../../components/public/Footer";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { appointmentService, MAX_APPOINTMENT_CAPACITY } from "../../services/appointmentService";
import { barangayConfig } from "../../config/barangay";
import type { AppointmentReason } from "../../types/appointment";

const REASON_OPTIONS: { value: AppointmentReason; label: string; desc: string }[] = [
  { value: "Free Check-up", label: "General Check-up", desc: "Physical check-up, vitals triage, & primary consultation" },
  { value: "Medicine", label: "Medicine Dispensation", desc: "Request maintenance pills, antibiotics, or first-aid supplies" },
  { value: "Vaccination", label: "Vaccination / Immunization", desc: "Routine childhood immunization, anti-tetanus, or adult flu shots" },
];

const COMMON_PUROKS: string[] = [
  "Purok 1",
  "Purok 2",
  "Purok 3",
  "Purok 4",
  "Purok 5",
  "Purok 6",
  "Purok 7",
  "Sitio Centro",
  "Sitio Ibaba",
  "Sitio Ilaya",
];

interface AppointmentInputState {
  lastName: string;
  firstName: string;
  middleName: string;
  contactNumber: string;
  barangay: string;
  purok: string;
  reason: AppointmentReason | "";
  notes: string;
}

const initialForm: AppointmentInputState = {
  lastName: "",
  firstName: "",
  middleName: "",
  contactNumber: "",
  barangay: barangayConfig.name || "Barangay Kumintang Ilaya",
  purok: "",
  reason: "",
  notes: "",
};

type Errors = Partial<Record<keyof AppointmentInputState | "idPhoto", string>>;

export default function MedicalAppointment() {
  const [form, setForm] = useState<AppointmentInputState>(initialForm);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const [isCheckingCapacity, setIsCheckingCapacity] = useState(true);
  const [isCapacityFull, setIsCapacityFull] = useState(false);
  const [intakeCount, setIntakeCount] = useState(0);

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

  function update<K extends keyof AppointmentInputState>(key: K, value: AppointmentInputState[K]) {
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
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.contactNumber.trim()) next.contactNumber = "Mobile number is required.";
    else if (!/^[\d\s+()-]{7,}$/.test(form.contactNumber))
      next.contactNumber = "Please enter a valid 11-digit mobile number.";
    if (!form.purok.trim()) next.purok = "Please enter your Purok, Sitio, or Street address.";
    if (!form.barangay.trim()) next.barangay = "Barangay is required.";
    if (!form.reason) next.reason = "Please choose a healthcare service.";
    if (!idFile) next.idPhoto = "PhilSys or Barangay ID photo is required for residency verification.";

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
        lastName: form.lastName,
        firstName: form.firstName,
        middleName: form.middleName,
        contactNumber: form.contactNumber,
        barangay: form.barangay,
        purok: form.purok,
        reason: form.reason,
        notes: form.notes,
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
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      <Navbar />
      <main className="container-page py-10 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/#services"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-navy-900 dark:text-white/60 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Public Services
          </Link>

          {confirmedId ? (
            <Card className="mt-6 border-slate-200 p-8 text-center dark:border-white/10 dark:bg-navy-900">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Appointment Registered
              </h1>
              <p className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Barangay Kumintang Ilaya Health Desk
              </p>

              <div className="mx-auto mt-6 max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-white/10 dark:bg-white/5">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Your Reference Number</span>
                <p className="font-mono text-2xl font-black text-blue-700 dark:text-blue-400">{confirmedId}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Save this number. Present this upon reporting to the health triage counter.
                </p>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmedId(null);
                    setForm(initialForm);
                    removeIdFile();
                  }}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Book Another Patient
                </Button>
                <Link to="/">
                  <Button fullWidth className="text-xs font-bold uppercase tracking-wider bg-navy-900 text-white dark:bg-blue-600">
                    Return to Homepage
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-navy-900">
              {/* Institutional Header Banner */}
              <div className="border-b border-slate-200 bg-slate-900 p-6 text-white dark:border-white/10 dark:bg-navy-950 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <HeartPulse className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300">
                      City of Batangas • Health Services Division
                    </span>
                    <h1 className="text-xl font-black uppercase tracking-tight sm:text-2xl">
                      Patient Consultation & Medical Request
                    </h1>
                    <p className="mt-1 text-xs text-slate-300">
                      Complete this official intake sheet. The Barangay Triage Desk will verify your PhilSys record and queue your slot.
                    </p>
                  </div>
                </div>
              </div>

              {isCheckingCapacity ? (
                <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Verifying Health Center Capacity...
                </div>
              ) : isCapacityFull ? (
                <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
                  <AlertOctagon className="mx-auto h-8 w-8 text-red-600" />
                  <h2 className="mt-2 text-sm font-bold uppercase text-red-900 dark:text-red-300">
                    Daily Appointment Capacity Reached ({intakeCount}/{MAX_APPOINTMENT_CAPACITY})
                  </h2>
                  <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                    The health center intake quota for today is filled. For emergencies or urgent triage, please walk in directly to the Barangay Health Center.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6 sm:p-8">
                  {/* SECTION 1: Patient Identity */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-white/10 dark:text-white">
                      <User className="h-4 w-4 text-blue-600" />
                      1. Patient Personal Information
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <Input
                        label="Last Name *"
                        placeholder="e.g. Dela Cruz"
                        value={form.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                        error={errors.lastName}
                        required
                      />
                      <Input
                        label="First Name *"
                        placeholder="e.g. Juan"
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                        error={errors.firstName}
                        required
                      />
                      <Input
                        label="Middle Name (Optional)"
                        placeholder="e.g. Santos"
                        value={form.middleName}
                        onChange={(e) => update("middleName", e.target.value)}
                        hint="Optional"
                      />
                    </div>
                  </div>

                  {/* SECTION 2: Address & Contact with Free-Text Purok */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-white/10 dark:text-white">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      2. Residence & Mobile Contact
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <Input
                          label="Purok / Sitio / Street *"
                          placeholder="e.g. Purok 3, Sitio Ilaya"
                          value={form.purok}
                          onChange={(e) => update("purok", e.target.value)}
                          error={errors.purok}
                          list="purok-suggestions"
                          required
                        />
                        <datalist id="purok-suggestions">
                          {COMMON_PUROKS.map((p) => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                      </div>

                      <Input
                        label="Barangay *"
                        value={form.barangay}
                        onChange={(e) => update("barangay", e.target.value)}
                        error={errors.barangay}
                        required
                      />

                      <Input
                        label="Active Mobile Number *"
                        placeholder="09XX-XXX-XXXX"
                        value={form.contactNumber}
                        onChange={(e) => update("contactNumber", e.target.value)}
                        error={errors.contactNumber}
                        required
                      />
                    </div>
                  </div>

                  {/* SECTION 3: Service Selection */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-white/10 dark:text-white">
                      <Stethoscope className="h-4 w-4 text-blue-600" />
                      3. Health Service Category
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {REASON_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => update("reason", opt.value)}
                          className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                            form.reason === opt.value
                              ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 dark:border-blue-400 dark:bg-blue-950/30"
                              : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {opt.label}
                            </span>
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                form.reason === opt.value
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {form.reason === opt.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-white/60 leading-snug">
                            {opt.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                    {errors.reason && (
                      <p className="mt-1.5 text-[11px] font-semibold text-red-600">{errors.reason}</p>
                    )}

                    <div className="mt-4">
                      <Textarea
                        label="Symptoms / Specific Medicine Details"
                        placeholder="Indicate your symptoms, health concerns, or requested maintenance medicine name..."
                        value={form.notes}
                        onChange={(e) => update("notes", e.target.value)}
                        hint="Optional"
                      />
                    </div>
                  </div>

                  {/* SECTION 4: PhilSys ID Verification */}
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-white/10 dark:text-white">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        4. PhilSys / Resident Verification Document *
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">PhilSys / Barangay ID / Driver's License</span>
                    </div>

                    {!idPreview ? (
                      <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-slate-400 dark:border-white/15 dark:bg-white/5">
                        <Upload className="h-6 w-6 text-slate-500" />
                        <span className="mt-2 text-xs font-bold uppercase text-slate-900 dark:text-white">
                          Click to attach PhilSys or Valid ID photo
                        </span>
                        <span className="mt-0.5 text-[10px] text-slate-500">
                          Clear photo or scan (PNG, JPG, or JPEG up to 5MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleIdFileChange}
                        />
                      </label>
                    ) : (
                      <div className="relative mt-3 overflow-hidden rounded-xl border border-emerald-300 dark:border-emerald-800/60">
                        <img
                          src={idPreview}
                          alt="Attached ID"
                          className="h-40 w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-slate-950/80 via-transparent p-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <FileCheck className="h-4 w-4 text-emerald-400" />
                            {idFile?.name}
                          </span>
                          <button
                            type="button"
                            onClick={removeIdFile}
                            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    {errors.idPhoto && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.idPhoto}</p>
                    )}
                  </div>

                  <div className="flex items-start gap-2 rounded-xl bg-blue-50/60 p-3 text-xs text-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
                    <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>
                      Submitted records are strictly governed by Republic Act No. 10173 (Data Privacy Act of 2012) and used exclusively for health center scheduling.
                    </span>
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    className="rounded-xl bg-slate-900 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    {isSubmitting ? "Uploading ID & Transmitting Request..." : "Submit Official Appointment Request"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}