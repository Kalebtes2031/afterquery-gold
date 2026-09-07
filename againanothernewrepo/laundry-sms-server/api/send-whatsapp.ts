// api/send-whatsapp.ts  (Vercel serverless function)
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS Handling using ALLOWED_ORIGINS env var ───────────────────────────────
  const allowedOriginsStr = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = req.headers.origin || '';
  let corsOrigin = '*'; // fallback (safe for non-credential requests)

  if (allowedOrigins.includes(origin)) {
    corsOrigin = origin;
  }

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request (required for CORS in browser)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Everything below is unchanged from your original working version ────────
  const { to, templateName, variables = [], language = 'en_US', orderId } = req.body;

  if (!to || !templateName) {
    return res.status(400).json({ error: 'Missing to or templateName' });
  }

  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('Missing env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const formattedTo = to.replace(/[^\d]/g, '');
  const fullTo = formattedTo.startsWith('254') ? formattedTo : `254${formattedTo.replace(/^0/, '')}`;

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: fullTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: variables.length > 0 ? [{
            type: 'body',
            parameters: variables.map((text: any) => ({ type: 'text', text })),
          }] : [],
        },
      }),
    });

    const data = await response.json() as { messages?: Array<{ id: string }> };

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return res.status(response.status).json({ success: false, error: data });
    }

    // Optional: log to Firestore here if you want (like your SMS log)

    return res.status(200).json({ success: true, messageId: data.messages?.[0]?.id, data });
  } catch (error: any) {
    console.error('Send error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}