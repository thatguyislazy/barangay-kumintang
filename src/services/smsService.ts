import { supabase } from "../supabase/supabase";

type SmsResult = { success: true; data: unknown } | { success: false; error: string };

// The edge function looks up the phone number and builds the message itself,
// so the browser only identifies *which* appointment and *which* notification.
async function invokeSendSms(body: {
  appointmentId: string;
  type: "pending" | "confirmed";
  queueNumber?: number;
}): Promise<SmsResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", { body });

    if (error) {
      console.error("[SMS Service] Function invocation error:", error);
      return { success: false, error: error.message };
    }

    if (data?.status === "error") {
      console.warn("[SMS Service] SMS not sent:", data.message);
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[SMS Service] Exception:", err);
    return { success: false, error: err.message };
  }
}

export const smsService = {
  /** Sent right after a patient books (public form). Works once per appointment. */
  sendPending(appointmentId: string) {
    return invokeSendSms({ appointmentId, type: "pending" });
  },

  /** Sent when an admin confirms an appointment. Requires a signed-in admin. */
  sendConfirmed(appointmentId: string, queueNumber: number) {
    return invokeSendSms({ appointmentId, type: "confirmed", queueNumber });
  },
};