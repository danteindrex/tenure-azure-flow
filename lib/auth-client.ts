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
import { passkeyClient, twoFactorClient, organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Enable client-side plugins
  plugins: [
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
