import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Share2, CheckCircle2 } from "lucide-react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { barangayConfig } from "../../config/barangay";

const contactDetails = [
  { icon: MapPin, label: "Barangay Hall", value: barangayConfig.address },
  { icon: Phone, label: "Phone", value: barangayConfig.phone },
  { icon: Mail, label: "Email", value: barangayConfig.email },
  { icon: Clock, label: "Office Hours", value: barangayConfig.officeHours },
];

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 900);
  }

  return (
    <section id="contact" className="bg-white py-20 dark:bg-navy-950 lg:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-navy-500">
            Contact Us
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-navy-900 dark:text-white lg:text-4xl">
            We're here to help
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {contactDetails.map((detail) => (
              <div
                key={detail.label}
                className="flex items-start gap-4 rounded-2xl border border-surface-border bg-surface-off p-5 dark:border-white/10 dark:bg-white/5"
              >
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-white dark:bg-navy-500">
                  <detail.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-white/50">
                    {detail.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-900 dark:text-white">
                    {detail.value}
                  </p>
                </div>
              </div>
            ))}
            <a
              href={barangayConfig.socials.facebook}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:underline dark:text-navy-300"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Follow us on Facebook
            </a>
          </div>

          <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-card dark:border-white/10 dark:bg-navy-800/60 sm:p-8">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden="true" />
                <p className="font-display text-lg font-bold text-navy-900 dark:text-white">
                  Message sent
                </p>
                <p className="max-w-xs text-sm text-ink-500 dark:text-white/50">
                  Thank you for reaching out. The barangay office will get back to you
                  shortly.
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <Input label="Name" name="name" placeholder="Juan Dela Cruz" required />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="juan@email.com"
                  required
                />
                <Textarea
                  label="Message"
                  name="message"
                  placeholder="How can we help you?"
                  required
                />
                <Button type="submit" fullWidth isLoading={isSubmitting}>
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
