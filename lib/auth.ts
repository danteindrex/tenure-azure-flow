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
import { twoFactor, organization } from 'better-auth/plugins'
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
    sendResetPasswordEmail: async ({ user, url, token }) => {
      try {
        await emailService.sendPasswordResetEmail({
          to: user.email,
          token,
          url
        })
      } catch (error) {
        console.error('Failed to send reset password email:', error)
        throw error
      }
    }
  },

  // Email verification configuration (separate from emailAndPassword)
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      console.log('📧 Better Auth: Attempting to send verification email...')
      console.log('   User:', user.email)
      console.log('   URL:', url)
      console.log('   Token:', token)
      
      try {
        await emailService.sendVerificationEmail({
          to: user.email,
          token,
          url
        })
        
        console.log('✅ Better Auth: Email sent successfully via SMTP!')
        
      } catch (error) {
        console.error('❌ Better Auth: Failed to send verification email:', error)
        throw error
      }
    }
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
