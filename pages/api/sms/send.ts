import type { NextApiRequest, NextApiResponse } from 'next';

// Server-side API that posts SMS messages to Twilio using server env vars.
// IMPORTANT: Do not commit your TWILIO_* credentials to source control. Set them
// in a local `.env.local` or your deployment platform's secret store.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, body } = req.body || {};
  if (!to || !body) {
    return res.status(400).json({ error: 'Missing "to" or "body" in request' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio env vars missing');
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;

  const payload = new URLSearchParams();
  payload.append('To', to);
  payload.append('From', fromNumber);
  payload.append('Body', body);

  const basic = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error('Twilio error', resp.status, data);
      return res.status(resp.status).json({ error: data || 'Twilio error' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
}
