/**
 * Better Auth Configuration
 *
 * This file configures Better Auth with:
 * - Drizzle ORM adapter for database
 * - Gmail SMTP for email verification
 * - Google OAuth provider
 * - Passkey (WebAuthn) support
 * - Two-factor authentication (TOTP + backup codes)
 * - Organization management
 */

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor, organization, emailOTP } from 'better-auth/plugins'
import { passkey } from 'better-auth/plugins/passkey'
import { db } from '../drizzle/db'
import { emailService } from '../src/lib/email'

// SMTP email service initialized

export const auth = betterAuth({
  // Database adapter
  database: drizzleAdapter(db, { 
    provider: 'pg'
  }),

  // Base URL for authentication
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  // Secret for JWT tokens
  secret: process.env.BETTER_AUTH_SECRET!,

  // Email & Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  // Social authentication providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Request additional scopes if needed
      // scope: ['email', 'profile', 'openid']
    }
  },

  // Plugins
  plugins: [
    nextCookies(),  // Required for Next.js cookie management

    // Email OTP plugin for 6-digit verification codes
    emailOTP({
      // Override default email verification to use OTP instead of links
      overrideDefaultEmailVerification: true,
      // 6-digit OTP (default)
      otpLength: 6,
      // OTP expires in 10 minutes
      expiresIn: 600,
      // Send verification OTP when user signs up
      sendVerificationOnSignUp: true,
      // Allow 3 attempts before invalidating OTP
      allowedAttempts: 3,
      // Send OTP via our email service
      async sendVerificationOTP({ email, otp, type }) {
        console.log('📧 Better Auth: Sending OTP email...')
        console.log('   Email:', email)
        console.log('   OTP (6-digit):', otp)
        console.log('   Type:', type)
        
        try {
          if (type === 'email-verification') {
            await emailService.sendVerificationEmail({
              to: email,
              token: otp,
              url: `${process.env.BETTER_AUTH_URL}/verify-email?email=${email}&otp=${otp}`
            })
          } else if (type === 'forget-password') {
            await emailService.sendPasswordResetEmail({
              to: email,
              token: otp,
              url: `${process.env.BETTER_AUTH_URL}/reset-password?email=${email}&otp=${otp}`
            })
          } else if (type === 'sign-in') {
            // For sign-in OTP, we can use the verification template
            await emailService.sendVerificationEmail({
              to: email,
              token: otp,
              url: `${process.env.BETTER_AUTH_URL}/sign-in?email=${email}&otp=${otp}`
            })
          }
          
          console.log('✅ Better Auth: OTP email sent successfully!')
          
        } catch (error) {
          console.error('❌ Better Auth: Failed to send OTP email:', error)
          throw error
        }
      }
    }),

    // Passkey plugin (WebAuthn support)
    passkey({
      rpName: 'Tenure',
      rpID: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost'
    }),

    // Two-Factor Authentication plugin (TOTP + backup codes)
    twoFactor({
      // Issuer name shown in authenticator apps
      issuer: 'Tenure'
    }),

    // Organization plugin (team management)
    organization({
      // Allow users to create organizations
      allowUserToCreateOrganization: true,
      // Require organization for certain features
      // organizationRequired: false
    })
  ],

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,       // Update session every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5  // Cache for 5 minutes
    }
  },

  // Advanced configuration
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(), // Generate UUIDs for Better Auth
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
    // Cross-origin settings for API
    crossSubDomainCookies: {
      enabled: false
    }
  },

  // Rate limiting (optional - recommended for production)
  // rateLimit: {
  //   enabled: true,
  //   window: 60,  // 60 seconds
  //   max: 10      // 10 requests per window
  // }
})

// Export types for use in application
export type Session = typeof auth.$Infer.Session
