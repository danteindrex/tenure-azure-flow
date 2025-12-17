import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ error: 'Support tickets functionality not implemented yet' });
}