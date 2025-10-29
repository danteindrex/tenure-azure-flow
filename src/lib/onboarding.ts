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
import { users, userProfiles } from '../../drizzle/schema/users'
import { userSubscriptions } from '../../drizzle/schema/financial'
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
      // Get user data
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then(rows => rows[0])

      if (!user) {
        throw new Error('User not found')
      }

      // Get user profile
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
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
        isEmailVerified: user.emailVerified || isOAuthUser || false, // OAuth users have verified emails
        hasProfile: !!profile,
        isPhoneVerified: profile?.phoneVerified || false,
        hasActiveSubscription: !!subscription,
        canAccessDashboard: false,
        userId: user.id,
        profileId: profile?.id,
        nextRoute: '/signup',
        nextStep: 1
      }

      // Determine current step and dashboard access
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
        status.nextStep = 7
        status.nextRoute = '/signup?step=7'
      } else {
        status.step = 'dashboard'
        status.canAccessDashboard = true
        status.nextRoute = '/dashboard'
        status.nextStep = 8 // Completed
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