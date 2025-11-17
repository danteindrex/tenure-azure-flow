import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SubscriptionController } from '../../src/controllers/subscription.controller';
import cookieParser from 'cookie-parser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse cookies manually for Vercel
  const cookies = cookieParser.signedCookie as any;
  const parsedCookies: any = {};
  const cookieHeader = req.headers.cookie || '';

  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const key = parts.shift()?.trim();
      const value = decodeURIComponent(parts.join('='));
      if (key) {
        parsedCookies[key] = value;
      }
    });
  }

  // Create Express-compatible request object
  const expressReq: any = {
    ...req,
    cookies: parsedCookies,
    body: req.body,
    headers: req.headers,
  };

  const expressRes: any = {
    ...res,
    status: (code: number) => {
      res.status(code);
      return expressRes;
    },
    json: (data: any) => res.json(data),
  };

  return SubscriptionController.createCheckoutSession(expressReq, expressRes);
}
