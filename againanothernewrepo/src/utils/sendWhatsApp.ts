import { db } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://laundry-sms-server.vercel.app";

const WHATSAPP_ENDPOINT = `${API_BASE}/api/send-whatsapp`;

export const sendWhatsApp = async ({
  to,
  templateName,
  variables = [],
  orderId,
  language = "en_US",
}: {
  to: string;
  templateName: string;
  variables?: string[];
  orderId: string;
  language?: string;
}) => {
  try {
    const res = await fetch(WHATSAPP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, templateName, variables, language, orderId }),
    });

    const data = await res.json();
    const success = data.success === true;

    await setDoc(doc(db, "whatsappLog", `${orderId}_${Date.now()}`), {
      phone: to,
      templateName,
      variables,
      status: success ? "sent" : "failed",
      error: success ? null : JSON.stringify(data.error || data),
      messageId: data.messageId || null,
      sentAt: serverTimestamp(),
      orderId,
    });

    return success;
  } catch (error) {
    console.error("WhatsApp error:", error);
    return false;
  }
};