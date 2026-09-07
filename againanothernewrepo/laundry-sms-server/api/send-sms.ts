import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ CORS headers (always set)
  res.setHeader("Access-Control-Allow-Origin", "https://laundryroom-booking-hub.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Only allow POST after OPTIONS
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Parse body safely
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { to, message } = body || {};
  if (!to || !message) {
    return res.status(400).json({ error: "Missing 'to' or 'message'" });
  }

  const apiKey = process.env.INFOBIP_API_KEY;
  const from = process.env.INFOBIP_FROM || "InfoSMS";

  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const response = await axios.post(
      "https://api.infobip.com/sms/2/text/advanced",
      {
        messages: [
          {
            destinations: [{ to }],
            from,
            text: message,
          },
        ],
      },
      {
        headers: {
          Authorization: `App ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return res.status(200).json({ success: true, data: response.data });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
}
