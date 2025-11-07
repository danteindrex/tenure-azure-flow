/**
 * Onboarding Flow Management - SERVER SIDE ONLY
 * 
 * This file should ONLY be imported in API routes, never in client components
 * Tracks user progress through the signup/onboarding process:
 * 1. Email verification
 * 2. Profile completion
 * 3. Phone verification
 * 4. Payment/subscription
 * 5. Dashboard access (paid members only)
 */

import { db } from '../../drizzle/db'
import { userProfiles, userContacts } from '../../drizzle/schema/users'
import { userSubscriptions } from '../../drizzle/schema/financial'
import { user } from '../../drizzle/schema/auth'
import { eq, and } from 'drizzle-orm'

export type OnboardingStep = 
  | 'email-verification'
  | 'complete-profile' 
  | 'phone-verification'
  | 'payment'
  | 'dashboard'

export interface UserOnboardingStatus {
  step: OnboardingStep
  isEmailVerified: boolean
  hasProfile: boolean
  isPhoneVerified: boolean
  hasActiveSubscription: boolean
  canAccessDashboard: boolean
  userId?: string
  profileId?: string
  nextRoute: string
  nextStep: number
}

export class OnboardingService {
  
  /**
   * Get the current onboarding status for a user
   * SERVER SIDE ONLY - Do not call from client components
   */
  static async getUserOnboardingStatus(userId: string, isOAuthUser?: boolean): Promise<UserOnboardingStatus> {
    try {
      // Get user data directly from Better Auth user table
      const betterAuthUser = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .then(rows => rows[0])

      if (!betterAuthUser) {
        throw new Error('User not found in Better Auth')
      }

      // Get user profile
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1)
        .then(rows => rows[0])

      // Check if phone is verified by looking at user_contacts
      const phoneContact = await db
        .select()
        .from(userContacts)
        .where(
          and(
            eq(userContacts.userId, userId),
            eq(userContacts.contactType, 'phone'),
            eq(userContacts.isVerified, true)
          )
        )
        .limit(1)
        .then(rows => rows[0])

      // Get active subscription
      const subscription = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.status, 'active')
          )
        )
        .limit(1)
        .then(rows => rows[0])

      const status: UserOnboardingStatus = {
        step: 'email-verification',
        isEmailVerified: betterAuthUser.emailVerified || isOAuthUser || false,
        hasProfile: !!profile,
        isPhoneVerified: !!phoneContact,
        hasActiveSubscription: !!subscription,
        canAccessDashboard: false,
        userId: betterAuthUser.id,
        profileId: profile?.id,
        nextRoute: '/signup',
        nextStep: 1
      }

      // Determine current step based on actual database state
      // ONLY users with status 'Active' can access dashboard
      if (!status.isEmailVerified && !isOAuthUser) {
        status.step = 'email-verification'
        status.nextStep = 2
        status.nextRoute = '/signup?step=2'
      } else if (!status.hasProfile) {
        status.step = 'complete-profile'
        status.nextStep = 3
        status.nextRoute = '/signup?step=3'
      } else if (!status.isPhoneVerified) {
        status.step = 'phone-verification'
        status.nextStep = 4
        status.nextRoute = '/signup?step=4'
      } else if (!status.hasActiveSubscription) {
        status.step = 'payment'
        status.nextStep = 5
        status.nextRoute = '/signup?step=5'
      } else if (betterAuthUser.status === 'Active') {
        // All steps completed AND status is Active - grant dashboard access
        status.step = 'dashboard'
        status.canAccessDashboard = true
        status.nextRoute = '/dashboard'
        status.nextStep = 6 // Completed
      } else {
        // All steps completed but status is not Active (e.g., Pending)
        // Keep them on payment step until admin approves
        status.step = 'payment'
        status.nextStep = 5
        status.nextRoute = '/signup?step=5'
      }

      return status
    } catch (error) {
      console.error('Error getting user onboarding status:', error)
      throw error
    }
  }

  /**
   * Get the next route based on onboarding status
   * SERVER SIDE ONLY
   */
  static getNextRoute(status: UserOnboardingStatus, isOAuthUser?: boolean): string {
    if (!status.isEmailVerified && !isOAuthUser) {
      return '/signup?step=2' // Email verification
    } else if (!status.hasProfile) {
      return '/signup?step=3' // Personal info - OAuth users skip to here
    } else if (!status.isPhoneVerified) {
      return '/signup?step=4' // Phone verification
    } else if (!status.hasActiveSubscription) {
      return '/signup?step=7' // Payment
    } else {
      return '/dashboard' // Everything complete
    }
  }

  /**
   * Check if user can access dashboard (paid members only)
   * SERVER SIDE ONLY
   */
  static canAccessDashboard(status: UserOnboardingStatus): boolean {
    return status.canAccessDashboard
  }

  /**
   * Update user onboarding step
   * SERVER SIDE ONLY
   */
  static async updateUserStep(userId: string, step: OnboardingStep): Promise<void> {
    try {
      // This could be used to track progress in a separate table if needed
      console.log(`User ${userId} completed step: ${step}`)
    } catch (error) {
      console.error('Error updating user step:', error)
    }
  }
}

export default OnboardingService