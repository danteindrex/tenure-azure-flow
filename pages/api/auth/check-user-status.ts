import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Handle GET request for checking current user's verification status
  if (req.method === "GET") {
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      
      if (!session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // For now, return a default verification status
      // This can be enhanced to check actual KYC/verification status from database
      return res.status(200).json({
        isVerified: false, // Default to false to show the banner
        userId: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified || false
      });

    } catch (error) {
      console.error('Error checking user verification status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // For POST requests, return basic user existence check
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // TODO: Implement user lookup with Drizzle ORM
    // For now, return basic response
    return res.status(200).json({
      userExists: false,
      needsEmailVerification: true,
    });

  } catch (err: any) {
    console.error('Check user status error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err?.message || 'Unexpected error' 
    });
  }
}