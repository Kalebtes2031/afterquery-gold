import { db } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://laundry-sms-server.vercel.app";

const SMS_ENDPOINT = `${API_BASE}/api/send-sms`;

// Format for Infobip: 2547xxxxxxxx (no +)
function formatPhone(phone: string): string {
  let p = phone.replace(/[\s\-\(\)]/g, "");

  if (p.startsWith("+254")) return p.slice(1);
  if (p.startsWith("254")) return p;
  if (p.startsWith("0")) return "254" + p.slice(1);
  if (p.length === 9) return "254" + p;

  return p;
}

export const sendSMS = async ({ to, message, orderId }: { to: string; message: string; orderId: string }) => {
  try {
    const phone = formatPhone(to);

    const res = await fetch(SMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, message }),
    });

    const data = await res.json();
    const success = data.success === true;

    await setDoc(doc(db, "smsLog", `${orderId}_${Date.now()}`), {
      phone,
      message,
      status: success ? "sent" : "failed",
      error: success ? null : JSON.stringify(data),
      sentAt: serverTimestamp(),
      orderId,
    });

    return success;
  } catch (error) {
    console.error("SMS error:", error);
    return false;
  }
};