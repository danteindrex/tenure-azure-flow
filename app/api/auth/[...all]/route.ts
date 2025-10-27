/**
 * Better Auth API Route Handler
 *
 * This route handles all authentication requests:
 * - /api/auth/signin
 * - /api/auth/signup
 * - /api/auth/signout
 * - /api/auth/session
 * - /api/auth/callback/google
 * - /api/auth/verify-email
 * - /api/auth/reset-password
 * - /api/auth/passkey/register
 * - /api/auth/passkey/authenticate
 * - /api/auth/two-factor/enable
 * - /api/auth/two-factor/verify
 * - And more...
 */

import { auth } from '@/lib/auth'

// Export GET and POST handlers
export const { GET, POST } = auth.handler
