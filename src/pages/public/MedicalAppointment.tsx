import { useState, useMemo, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  HeartPulse,
  Upload,
  FileCheck,
  X,
  User,
  MapPin,
  Stethoscope,
  ShieldCheck,
  Info,
  Calendar,
  Clock3,
} from "lucide-react";
import { Navbar } from "../../components/public/Navbar";
import { Footer } from "../../components/public/Footer";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { appointmentService, CLINIC_20_SLOTS } from "../../services/appointmentService";
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
  date: string;
  time: string;
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
  date: "",
  time: "",
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
  const [submittedData, setSubmittedData] = useState<{ id: string; date: string; time: string; phone: string } | null>(null);

  // Minimum date allowed is tomorrow (same-day booking disallowed)
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
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
    if (!form.date) next.date = "Please select an appointment date (Tomorrow onward).";
    if (!form.time) next.time = "Please select your preferred time slot.";
    if (!form.reason) next.reason = "Please choose a healthcare service.";
    if (!idFile) next.idPhoto = "PhilSys or Barangay ID photo is required for residency verification.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
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
        date: form.date,
        time: form.time,
        reason: form.reason,
        notes: form.notes,
        idPhotoUrl: uploadedUrl,
      });

      setSubmittedData({
        id: created.id,
        date: form.date,
        time: form.time,
        phone: form.contactNumber,
      });
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

          {/* SUBMITTED / PENDING NOTICE (NO QUEUE NUMBER DISPLAYED YET) */}
          {submittedData ? (
            <Card className="mt-6 border-slate-200 p-8 text-center dark:border-white/10 dark:bg-navy-900">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Clock3 className="h-8 w-8" />
              </div>

              <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Request Pending Review
              </h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Status: Pending Barangay Verification
              </p>

              <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5 text-left text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-white/10">
                  <span className="text-slate-500">Tracking Reference:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{submittedData.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-white/10">
                  <span className="text-slate-500">Requested Schedule:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{submittedData.date} at {submittedData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact Number:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{submittedData.phone}</span>
                </div>
              </div>

              <div className="mx-auto mt-5 max-w-md rounded-lg bg-blue-50 p-3.5 text-left text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                <p className="font-bold mb-1">📢 Paunawa ukol sa Queue Number:</p>
                <p>
                  Nagpadala ang system ng <strong>SMS notification</strong> sa inyong mobile number. Susuriin ng Health Desk Administrator ang inyong residency at schedule sa loob ng <strong>24 oras</strong>.
                </p>
                <p className="mt-1 font-semibold">
                  Matatanggap ninyo sa pamamagitan ng text ang inyong <u>Opisyal na Queue Number</u> oras na ma-kumpirma at ma-accept ni Admin ang inyong appointment.
                </p>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedData(null);
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
              {/* Header Banner */}
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
                      Pumili ng petsa bukas pataas. Beripikahin ng Health Desk ang inyong request bago maglabas ng Queue Number.
                    </p>
                  </div>
                </div>
              </div>

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

                {/* SECTION 2: Address & Contact */}
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
                      label="Active Mobile Number(Dito/Globe Only) *"
                      placeholder="09XX-XXX-XXXX"
                      value={form.contactNumber}
                      onChange={(e) => update("contactNumber", e.target.value)}
                      error={errors.contactNumber}
                      required
                    />
                  </div>
                </div>

                {/* SECTION 3: Preferred Schedule */}
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-white/10 dark:text-white">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    3. Target Date & Time (Tomorrow Onward)
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white/80">
                        Appointment Date * (Bukas pataas)
                      </label>
                      <input
                        type="date"
                        min={tomorrowStr}
                        value={form.date}
                        onChange={(e) => update("date", e.target.value)}
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 dark:border-white/10 dark:bg-navy-950 dark:text-white cursor-pointer ${
                          errors.date ? "border-red-500" : "border-slate-300"
                        }`}
                        required
                      />
                      {errors.date && (
                        <p className="text-[11px] font-semibold text-red-600">{errors.date}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white/80">
                        Preferred Time Slot *
                      </label>
                      <select
                        value={form.time}
                        onChange={(e) => update("time", e.target.value)}
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 dark:border-white/10 dark:bg-navy-950 dark:text-white cursor-pointer ${
                          errors.time ? "border-red-500" : "border-slate-300"
                        }`}
                        required
                      >
                        <option value="">-- Choose Time Window --</option>
                        {CLINIC_20_SLOTS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {errors.time && (
                        <p className="text-[11px] font-semibold text-red-600">{errors.time}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Health Service Category */}
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-white/10 dark:text-white">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    4. Healthcare Service Required
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

                {/* SECTION 5: PhilSys ID Verification */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-white/10 dark:text-white">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      5. PhilSys / Resident Verification Document *
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
                    Ang inyong request ay dadaan sa 24-hour admin triage. Matatanggap ang Queue Number via SMS oras na kumpirmahin ng barangay.
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
                  {isSubmitting ? "Submitting & Sending SMS..." : "Submit Appointment (Pending Review)"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}