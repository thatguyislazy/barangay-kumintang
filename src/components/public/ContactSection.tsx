import { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { barangayConfig } from "../../config/barangay";

const ctoDetails = [
  {
    icon: Building2,
    label: "City Treasurer's Office (CTO)",
    value: "Ground Floor, Batangas City Hall, P. Burgos St., Batangas City",
  },
  {
    icon: MapPin,
    label: "Barangay Kumintang Ilaya Desk",
    value: barangayConfig.address,
  },
  {
    icon: Phone,
    label: "Hotlines",
    value: `${barangayConfig.phone} • (043) 723-1511 (CTO)`,
  },
  {
    icon: Mail,
    label: "Email",
    value: `treasury@batangascity.gov.ph • ${barangayConfig.email}`,
  },
];

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [inquiryType, setInquiryType] = useState("Community Tax / Cedula");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const generatedRef = `CTO-BKI-${Date.now().toString().slice(-6)}`;
      setTrackingNumber(generatedRef);
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);
  }

  return (
    <section id="contact" className="border-t border-navy-100 bg-white py-16 dark:border-white/10 dark:bg-navy-950 lg:py-20">
      <div className="container-page">
        {/* Simple Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Public Treasury & Barangay Desk
          </span>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-navy-900 dark:text-white">
            CTO & Barangay Inquiries
          </h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-white/60">
            Submit questions regarding community tax certificates (Cedula), clearances, or city health desk assistance.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-2">
          {/* Left Column: Clean Contact List */}
          <div className="space-y-3">
            {ctoDetails.map((detail) => (
              <div
                key={detail.label}
                className="flex items-start gap-3.5 rounded-xl border border-navy-100 bg-navy-50/30 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white dark:bg-blue-600">
                  <detail.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    {detail.label}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-navy-900 dark:text-white">
                    {detail.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Clean CTO Form */}
          <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-navy-900 sm:p-7">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
                <h3 className="font-display text-lg font-bold text-navy-900 dark:text-white">
                  Inquiry Logged
                </h3>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Tracking No: {trackingNumber}
                </div>
                <p className="max-w-xs text-xs text-ink-500 dark:text-white/60">
                  Present this reference number at the CTO counter or Barangay Health Center.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-medium"
                >
                  Send Another Inquiry
                </Button>
              </div>
            ) : (
              <form className="space-y-3.5" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-900 dark:text-white">
                    Service / Department
                  </label>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs text-navy-900 outline-none focus:border-blue-600 dark:border-white/10 dark:bg-navy-950 dark:text-white"
                  >
                    <option value="Community Tax / Cedula">Community Tax Certificate (Cedula)</option>
                    <option value="Barangay Clearance Assessment">Barangay Clearance & Fee Assessment</option>
                    <option value="Health Center & Medical Assistance">Health Center / Medical Aid Subsidy</option>
                    <option value="Real Property & Business Taxes">Real Property / Business Tax Verification</option>
                    <option value="General Public Inquiry">General Public Inquiry</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Full Name"
                    name="name"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                  <Input
                    label="Contact Number"
                    name="phone"
                    placeholder="0917-123-4567"
                    required
                  />
                </div>

                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="name@email.com"
                  required
                />

                <Textarea
                  label="Message / Transaction Details"
                  name="message"
                  rows={3}
                  placeholder="Specify details or requirements needed..."
                  required
                />

                <Button type="submit" fullWidth isLoading={isSubmitting} className="text-xs font-bold">
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Submit Inquiry
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}