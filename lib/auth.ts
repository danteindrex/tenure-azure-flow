/**
 * Better Auth Configuration
 *
 * This file configures Better Auth with:
 * - Drizzle ORM adapter for database
 * - Resend SMTP for email verification
 * - Google OAuth provider
 * - Passkey (WebAuthn) support
 * - Two-factor authentication (TOTP + backup codes)
 * - Organization management
 */

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor, organization } from 'better-auth/plugins'
import { db } from '@/drizzle/db'
import { Resend } from 'resend'

// Initialize Resend for email
const resend = new Resend(process.env.RESEND_API_KEY!)

export const auth = betterAuth({
  // Database adapter
  database: drizzleAdapter(db, { provider: 'pg' }),

  // Base URL for authentication
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  // Secret for JWT tokens
  secret: process.env.BETTER_AUTH_SECRET!,

  // Email & Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    // Send verification email using Resend
    sendVerificationEmail: async ({ user, url, token }) => {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          to: user.email,
          subject: 'Verify your email address',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Welcome to Tenure!</h1>
              <p style="color: #666; font-size: 16px;">
                Please verify your email address by clicking the button below:
              </p>
              <a href="${url}" style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #0070f3;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              ">Verify Email</a>
              <p style="color: #999; font-size: 14px;">
                Or use this code: <strong>${token}</strong>
              </p>
              <p style="color: #999; font-size: 12px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
          `
        })
      } catch (error) {
        console.error('Failed to send verification email:', error)
        throw error
      }
    },

    // Send password reset email
    sendResetPasswordEmail: async ({ user, url, token }) => {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          to: user.email,
          subject: 'Reset your password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Password Reset Request</h1>
              <p style="color: #666; font-size: 16px;">
                Click the button below to reset your password:
              </p>
              <a href="${url}" style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #0070f3;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              ">Reset Password</a>
              <p style="color: #999; font-size: 14px;">
                Or use this code: <strong>${token}</strong>
              </p>
              <p style="color: #999; font-size: 12px;">
                If you didn't request this, please ignore this email.
              </p>
            </div>
          `
        })
      } catch (error) {
        console.error('Failed to send reset password email:', error)
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

    // Passkey plugin temporarily disabled - not available in current Better Auth version

    // Two-Factor Authentication plugin (TOTP + backup codes)
    twoFactor({
      // Issuer name shown in authenticator apps
      issuer: 'Tenure',
      // Number of backup codes to generate
      backupCodeLength: 10
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
    generateId: false,  // Let PostgreSQL handle UUID generation
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
export type User = typeof auth.$Infer.User
