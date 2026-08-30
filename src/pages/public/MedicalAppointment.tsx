import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, HeartPulse } from "lucide-react";
import { Navbar } from "../../components/public/Navbar";
import { Footer } from "../../components/public/Footer";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { appointmentService } from "../../services/appointmentService";
import { barangayConfig } from "../../config/barangay";
import type { AppointmentFormData } from "../../types/appointment";

const initialForm: AppointmentFormData = {
  patientName: "",
  contactNumber: "",
  barangay: barangayConfig.shortName,
  date: "",
  time: "",
  reason: "",
  notes: "",
};

type Errors = Partial<Record<keyof AppointmentFormData, string>>;

export default function MedicalAppointment() {
  const [form, setForm] = useState<AppointmentFormData>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  function update<K extends keyof AppointmentFormData>(key: K, value: AppointmentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!form.patientName.trim()) next.patientName = "Patient name is required.";
    if (!form.contactNumber.trim()) next.contactNumber = "Contact number is required.";
    else if (!/^[\d\s+()-]{7,}$/.test(form.contactNumber))
      next.contactNumber = "Enter a valid contact number.";
    if (!form.barangay.trim()) next.barangay = "Barangay is required.";
    if (!form.date) next.date = "Appointment date is required.";
    else if (new Date(form.date) < new Date(new Date().toDateString()))
      next.date = "Date cannot be in the past.";
    if (!form.time) next.time = "Preferred time is required.";
    if (!form.reason.trim()) next.reason = "Reason for appointment is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const created = await appointmentService.create(form);
      setConfirmedId(created.id);
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
                Appointment Submitted
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600 dark:text-white/60">
                Your request has been received and will be reviewed by the barangay
                health administrator. Reference number{" "}
                <span className="font-semibold text-navy-800 dark:text-white">
                  {confirmedId}
                </span>{" "}
                — please keep this for your records.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => { setConfirmedId(null); setForm(initialForm); }}>
                  Book Another Appointment
                </Button>
                <Link to="/">
                  <Button fullWidth>Return to Homepage</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="mb-7 flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white dark:bg-navy-500">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-navy-900 dark:text-white">
                    Medical Appointment
                  </h1>
                  <p className="text-sm text-ink-500 dark:text-white/50">
                    Fill out the form below to request an appointment.
                  </p>
                </div>
              </div>

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
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="Appointment Date"
                    type="date"
                    value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                    error={errors.date}
                    required
                  />
                  <Input
                    label="Preferred Time"
                    type="time"
                    value={form.time}
                    onChange={(e) => update("time", e.target.value)}
                    error={errors.time}
                    required
                  />
                </div>
                <Input
                  label="Reason for Appointment"
                  placeholder="e.g. General checkup, vaccination"
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                  error={errors.reason}
                  required
                />
                <Textarea
                  label="Additional Notes"
                  placeholder="Optional — anything the health staff should know"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  hint="Optional"
                />

                <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Appointment"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
