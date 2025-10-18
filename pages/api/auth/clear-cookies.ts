import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const cookieHeader = req.headers.cookie || "";
  if (!cookieHeader) {
    return res.status(200).json({ success: true, cleared: 0 });
  }

  const pairs = cookieHeader.split(/;\s*/).filter(Boolean);
  const names = pairs
    .map((p) => p.split("=")[0])
    .filter((name, idx, arr) => name && arr.indexOf(name) === idx);

  const deletions = names.map(
    (name) => `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`
  );

  // Also clear common Supabase cookie names explicitly (in case attributes differ)
  const extra = [
    "sb-access-token",
    "sb-refresh-token",
    "supabase-auth-token",
    "supabase-session",
    "auth_token",
  ].map((name) => `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);

  res.setHeader("Set-Cookie", [...deletions, ...extra]);
  return res.status(200).json({ success: true, cleared: names.length });
}