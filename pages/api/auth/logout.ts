import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  // Clear auth cookie
  const cookie = `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  res.setHeader("Set-Cookie", cookie);

  return res.status(200).json({ success: true });
}