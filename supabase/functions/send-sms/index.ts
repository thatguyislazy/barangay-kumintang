// supabase/functions/send-sms/index.ts

// @ts-ignore: Deno runtime environment
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// Converts to UniSMS format: +639171234567
function normalizePHNumber(raw: string): string | null {
  let n = (raw || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "63" + n.slice(1);
  else if (n.length === 10) n = "63" + n;
  return /^639\d{9}$/.test(n) ? `+${n}` : null;
}

// Keep text GSM-friendly: "Niño" -> "Nino"
const clean = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();

type SmsType = "pending" | "confirmed";

function buildMessage(type: SmsType, appt: any, queueNumber?: number): string {
  const first = clean(appt.first_name || appt.patient_name) || "Patient";
  const ref = clean(appt.id);
  const when = `${clean(appt.date)} ${clean(appt.time)}`.trim();

  if (type === "pending") {
    return `Brgy Kumintang Ilaya: Hi ${first}, your request for ${clean(appt.reason)} on ${when} was received. Status: PENDING review. Ref ${ref}`;
  }

  return `Brgy Kumintang Ilaya: Hi ${first}, your appointment on ${when} is CONFIRMED. Queue #${queueNumber}. Ref ${ref}. Watch the Clinic TV on arrival.`;
}

async function sendViaUniSms(apiKey: string, senderId: string, to: string, content: string) {
  // Official UniSMS endpoint and Basic Auth specification
  const response = await fetch("https://unismsapi.com/api/sms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${apiKey.trim()}:`),
    },
    body: JSON.stringify({
      recipient: to,
      content: content,
      sender_id: senderId.trim(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

// @ts-ignore: Deno runtime environment
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { appointmentId, type, queueNumber } = await req.json();

    if (!appointmentId || (type !== "pending" && type !== "confirmed")) {
      return reply({ status: "error", message: "Invalid request format" }, 400);
    }

    // @ts-ignore: Deno runtime environment
    const apiKey = (Deno.env.get("UNISMS_API_KEY") || "").trim();
    // @ts-ignore: Deno runtime environment
    const senderId = (Deno.env.get("UNISMS_SENDER_ID") || "Unisoft").trim();

    if (!apiKey) {
      return reply({ status: "error", message: "UNISMS_API_KEY secret is not configured in Supabase" }, 500);
    }

    const admin = createClient(
      // @ts-ignore: Deno runtime environment
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore: Deno runtime environment
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validation for confirmed action
    if (type === "confirmed") {
      const authHeader = req.headers.get("Authorization") || "";
      const hasApiKey = Boolean(req.headers.get("apikey"));

      if (!authHeader && !hasApiKey) {
        return reply({ status: "error", message: "Unauthorized: Missing authorization headers" }, 401);
      }

      if (!Number.isInteger(queueNumber) || Number(queueNumber) < 1) {
        return reply({ status: "error", message: "Invalid or missing queue number" }, 400);
      }
    }

    const { data: appt, error: fetchErr } = await admin
      .from("appointments")
      .select("id, first_name, patient_name, contact_number, date, time, reason, status")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appt) {
      return reply({ status: "error", message: "Appointment record not found in database" }, 404);
    }

    const to = normalizePHNumber(appt.contact_number);
    if (!to) {
      return reply({ status: "error", message: `Invalid mobile number: ${appt.contact_number}` }, 400);
    }

    if (type === "pending") {
      if (appt.status !== "Pending") {
        return reply({ status: "error", message: "Appointment is not in pending state" }, 400);
      }

      // One-time dispatch claim check
      const { data: claimed, error: claimErr } = await admin
        .from("appointments")
        .update({ pending_sms_sent_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .is("pending_sms_sent_at", null)
        .select("id");

      if (claimErr) {
        return reply({ status: "error", message: `Claim lock error: ${claimErr.message}` }, 500);
      }
      if (!claimed || claimed.length === 0) {
        return reply({ status: "error", message: "Pending notification was already dispatched" }, 400);
      }
    } else if (appt.status !== "Confirmed") {
      return reply({ status: "error", message: "Appointment is not confirmed in database" }, 400);
    }

    const content = buildMessage(type, appt, queueNumber);
    const result = await sendViaUniSms(apiKey, senderId, to, content);

    if (!result.ok || result.data?.status === "error") {
      console.error("[UniSMS Gateway Error]:", result.status, result.data);

      if (type === "pending") {
        await admin.from("appointments").update({ pending_sms_sent_at: null }).eq("id", appointmentId);
      }

      return reply({
        status: "error",
        message: result.data?.message || result.data?.error || `UniSMS returned status ${result.status}`,
        details: result.data,
      }, 502);
    }

    return reply({ status: "success", data: result.data });
  } catch (error: any) {
    console.error("[Edge Function Error]:", error);
    return reply({ status: "error", message: error.message }, 500);
  }
});