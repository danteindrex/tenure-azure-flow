import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import OnboardingService from "../../../src/lib/onboarding";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Force no cache - always get fresh data
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', ''); // Remove ETag to prevent 304

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

    // Check if this is an OAuth user by fetching their accounts
    let isOAuthUser = false;
    try {
      const accounts = await auth.api.listUserAccounts({
        headers: new Headers(req.headers as any)
      });
      isOAuthUser = accounts.some((account: any) => 
        account.providerId !== 'credential' && account.providerId !== 'email'
      );
    } catch (error) {
      console.warn('Could not fetch user accounts:', error);
      // Default to false if we can't determine account type
    }

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