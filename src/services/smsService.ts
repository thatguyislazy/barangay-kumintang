import { supabase } from "../supabase/supabase";

type SmsResult = { success: true; data: unknown } | { success: false; error: string };

async function invokeSendSms(body: {
  appointmentId: string;
  type: "pending" | "confirmed" | "rejected";
  queueNumber?: number;
  rejectionReason?: string;
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
  sendPending(appointmentId: string) {
    return invokeSendSms({ appointmentId, type: "pending" });
  },

  sendConfirmed(appointmentId: string, queueNumber: number) {
    return invokeSendSms({ appointmentId, type: "confirmed", queueNumber });
  },

  sendRejected(appointmentId: string, rejectionReason: string) {
    return invokeSendSms({ appointmentId, type: "rejected", rejectionReason });
  },
};