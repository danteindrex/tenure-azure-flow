/**
 * Server-Side Onboarding Logic
 * 
 * This runs only on the server (API routes) to avoid client-side database imports
 * Determines user completion status and next steps
 */

export interface UserOnboardingStatus {
  isEmailVerified: boolean
  hasProfile: boolean
  hasActiveSubscription: boolean
  canAccessDashboard: boolean
  nextStep: number // Which signup step they should be on (1-7)
  nextRoute: string
}

export class OnboardingServerService {
  
  /**
   * Determine next signup step based on user status
   */
  static determineNextStep(user: any, isOAuthUser: boolean = false): UserOnboardingStatus {
    const status: UserOnboardingStatus = {
      isEmailVerified: user.emailVerified || isOAuthUser,
      hasProfile: false, // TODO: Check if profile exists in database
      hasActiveSubscription: false, // TODO: Check subscription status
      canAccessDashboard: false,
      nextStep: 1,
      nextRoute: '/signup'
    }

    // Determine next step
    if (!status.isEmailVerified) {
      status.nextStep = 2 // Email verification
      status.nextRoute = '/signup?step=2'
    } else if (!status.hasProfile) {
      status.nextStep = 3 // Personal info
      status.nextRoute = '/signup?step=3'
    } else if (!status.hasActiveSubscription) {
      status.nextStep = 7 // Payment
      status.nextRoute = '/signup?step=7'
    } else {
      status.canAccessDashboard = true
      status.nextRoute = '/dashboard'
    }

    return status
  }

  /**
   * Check if user can access dashboard
   */
  static canAccessDashboard(user: any): boolean {
    // For now, just check if user exists and email is verified
    // TODO: Add subscription check
    return user && user.emailVerified
  }
}

export default OnboardingServerService