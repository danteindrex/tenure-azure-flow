import type { NextApiRequest, NextApiResponse } from "next";

const validateCredentials = (email: string, password: string): boolean => {
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const pwdOk = typeof password === "string" && password.trim().length >= 6;
  return emailOk && pwdOk;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { email, password } = req.body || {};
  if (!validateCredentials(email, password)) {
    return res.status(400).json({ success: false, message: "Invalid email or password" });
  }

  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

  // Set HttpOnly auth cookie for 7 days
  const maxAge = 7 * 24 * 60 * 60; // seconds
  const cookie = `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  res.setHeader("Set-Cookie", cookie);

  return res.status(200).json({ success: true });
}