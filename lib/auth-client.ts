/**
 * Better Auth Client
 *
 * This file exports the auth client for use in React components.
 * It provides hooks and functions for authentication:
 * - useSession() - Get current session
 * - signIn() - Sign in with email/password or OAuth
 * - signUp() - Create new account
 * - signOut() - Sign out
 * - And more...
 */

'use client'

import { createAuthClient } from 'better-auth/react'
import { passkeyClient, twoFactorClient, organizationClient, emailOTPClient } from 'better-auth/client/plugins'

// Automatically detect the base URL
const getBaseURL = () => {
  // If explicitly set, use that
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // In browser, use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Default for SSR
  return 'http://localhost:3000'
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),

  // Enable client-side plugins
  plugins: [
    emailOTPClient(),     // Email OTP support
    passkeyClient(),      // Passkey (WebAuthn) support
    twoFactorClient(),    // 2FA support
    organizationClient()  // Organization management
  ]
})

// Export commonly used hooks and functions
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  updateUser
} = authClient

// Export the full client for advanced usage
export default authClient
