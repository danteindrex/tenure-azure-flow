import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import OnboardingService from "../../../src/lib/onboarding";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Get current user session - fix headers compatibility
    const session = await auth.api.getSession({ 
      headers: new Headers(req.headers as any)
    });
    
    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if this is an OAuth user
    const isOAuthUser = session.user.accounts?.some(account => 
      account.provider !== 'credential' && account.provider !== 'email'
    ) || false;

    // Get user's onboarding status using the server-side service
    const onboardingStatus = await OnboardingService.getUserOnboardingStatus(
      session.user.id, 
      isOAuthUser
    );

    return res.status(200).json({
      success: true,
      status: onboardingStatus,
      user: {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified
      }
    });

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}