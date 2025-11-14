/**
 * Better Auth Configuration for Payout Service
 * 
 * This module configures Better Auth session management for the payout service.
 * It shares the same database and session tables as the main application,
 * allowing seamless authentication across services.
 * 
 * Features:
 * - Session validation middleware
 * - Role-based access control (admin, finance_manager)
 * - Session refresh logic
 * - User context extraction
 * 
 * Usage:
 * ```typescript
 * import { validateSession, requireAdmin } from '@/config/auth'
 * 
 * // In Express route
 * app.get('/api/payouts', validateSession, requireAdmin, async (req, res) => {
 *   // req.user contains authenticated user info
 *   // req.session contains session data
 * })
 * ```
 */

import { Request, Response, NextFunction } from 'express'
import { db } from './database'
import { session, user, admin } from '../../drizzle/schema'
import { eq, and, gt } from 'drizzle-orm'
import { logger, redactSensitiveData } from '../utils/logger'

/**
 * Extended Express Request with user and session data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    name?: string | null
    emailVerified: boolean
    role?: string | null
    isAdmin?: boolean
    isFinanceManager?: boolean
  }
  session?: {
    id: string
    token: string
    expiresAt: Date
    userId: string
  }
}

/**
 * Validate session middleware
 * 
 * Extracts the session token from the Authorization header or cookies,
 * validates it against the database, and attaches user info to the request.
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function validateSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization
    const cookieToken = req.cookies?.['better-auth.session_token']
    
    let token: string | undefined
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (cookieToken) {
      token = cookieToken
    }
    
    if (!token) {
      logger.debug('No session token provided')
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      })
      return
    }
    
    // Query session from database
    const sessionResult = await db
      .select({
        session: session,
        user: user
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(
        and(
          eq(session.token, token),
          gt(session.expiresAt, new Date())
        )
      )
      .limit(1)
    
    if (sessionResult.length === 0) {
      logger.debug('Invalid or expired session token')
      res.status(401).json({
        error: {
          code: 'INVALID_SESSION',
          message: 'Session is invalid or expired',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      })
      return
    }
    
    const { session: userSession, user: userData } = sessionResult[0]
    
    // Check if user is an admin (query admin table)
    let adminData: any = null
    try {
      const adminResult = await db
        .select()
        .from(admin)
        .where(eq(admin.email, userData.email))
        .limit(1)
      
      if (adminResult.length > 0) {
        adminData = adminResult[0]
      }
    } catch (error) {
      // Admin table query failed, user is not an admin
      logger.debug('User is not an admin', { email: userData.email })
    }
    
    // Attach user and session to request
    req.user = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      emailVerified: userData.emailVerified || false,
      role: adminData?.role || null,
      isAdmin: adminData !== null && (adminData.role === 'Admin' || adminData.role === 'Super Admin'),
      isFinanceManager: adminData !== null && (adminData.role === 'Finance Manager' || adminData.role === 'Admin' || adminData.role === 'Super Admin')
    }
    
    req.session = {
      id: userSession.id,
      token: userSession.token,
      expiresAt: userSession.expiresAt,
      userId: userSession.userId
    }
    
    logger.debug('Session validated successfully', {
      userId: userData.id,
      email: userData.email,
      isAdmin: req.user.isAdmin,
      isFinanceManager: req.user.isFinanceManager
    })
    
    next()
  } catch (error) {
    logger.error('Session validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate session',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
  }
}

/**
 * Require admin role middleware
 * 
 * Ensures the authenticated user has admin privileges.
 * Must be used after validateSession middleware.
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    logger.warn('requireAdmin called without user context')
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
    return
  }
  
  if (!req.user.isAdmin) {
    logger.warn('Access denied: User is not an admin', {
      userId: req.user.id,
      email: req.user.email
    })
    
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
    return
  }
  
  next()
}

/**
 * Require finance manager role middleware
 * 
 * Ensures the authenticated user has finance manager privileges.
 * Must be used after validateSession middleware.
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function requireFinanceManager(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    logger.warn('requireFinanceManager called without user context')
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
    return
  }
  
  if (!req.user.isFinanceManager) {
    logger.warn('Access denied: User is not a finance manager', {
      userId: req.user.id,
      email: req.user.email
    })
    
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Finance manager access required',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
    return
  }
  
  next()
}

/**
 * Require member access middleware
 * 
 * Ensures the authenticated user can only access their own data.
 * Admins can access any user's data.
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function requireMemberAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    logger.warn('requireMemberAccess called without user context')
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
    return
  }
  
  // Extract userId from route params
  const requestedUserId = req.params.userId
  
  // Admins can access any user's data
  if (req.user.isAdmin) {
    next()
    return
  }
  
  // Regular users can only access their own data
  if (requestedUserId !== req.user.id) {
    logger.warn('Access denied: User attempting to access another user\'s data', {
      userId: req.user.id,
      requestedUserId
    })
    
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You can only access your own data',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
    return
  }
  
  next()
}

/**
 * Refresh session if needed
 * 
 * Checks if the session is close to expiring and refreshes it.
 * This should be called periodically for long-running sessions.
 * 
 * @param sessionToken - Session token to refresh
 * @returns Promise<boolean> - True if session was refreshed
 */
export async function refreshSessionIfNeeded(sessionToken: string): Promise<boolean> {
  try {
    // Query session
    const sessionResult = await db
      .select()
      .from(session)
      .where(eq(session.token, sessionToken))
      .limit(1)
    
    if (sessionResult.length === 0) {
      logger.debug('Session not found for refresh')
      return false
    }
    
    const userSession = sessionResult[0]
    const now = new Date()
    const expiresAt = new Date(userSession.expiresAt)
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const oneDayInMs = 24 * 60 * 60 * 1000
    
    // Refresh if session expires in less than 1 day
    if (timeUntilExpiry < oneDayInMs) {
      const newExpiresAt = new Date(now.getTime() + 7 * oneDayInMs) // Extend by 7 days
      
      await db
        .update(session)
        .set({
          expiresAt: newExpiresAt,
          updatedAt: now
        })
        .where(eq(session.id, userSession.id))
      
      logger.info('Session refreshed', {
        sessionId: userSession.id,
        userId: userSession.userId,
        newExpiresAt
      })
      
      return true
    }
    
    return false
  } catch (error) {
    logger.error('Failed to refresh session', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

/**
 * Check if user has specific role
 * 
 * @param userId - User ID to check
 * @param requiredRole - Required role (Admin, Finance Manager, etc.)
 * @returns Promise<boolean> - True if user has the role
 */
export async function hasRole(userId: string, requiredRole: string): Promise<boolean> {
  try {
    // Get user email
    const userResult = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    
    if (userResult.length === 0) {
      return false
    }
    
    // Check admin table
    const adminResult = await db
      .select({ role: admin.role })
      .from(admin)
      .where(eq(admin.email, userResult[0].email))
      .limit(1)
    
    if (adminResult.length === 0) {
      return false
    }
    
    return adminResult[0].role === requiredRole
  } catch (error) {
    logger.error('Failed to check user role', {
      userId,
      requiredRole,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

/**
 * Get user roles
 * 
 * @param userId - User ID
 * @returns Promise<string[]> - Array of roles
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    // Get user email
    const userResult = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    
    if (userResult.length === 0) {
      return []
    }
    
    // Check admin table
    const adminResult = await db
      .select({ role: admin.role })
      .from(admin)
      .where(eq(admin.email, userResult[0].email))
      .limit(1)
    
    if (adminResult.length === 0) {
      return ['member'] // Default role
    }
    
    const roles = ['member']
    const adminRole = adminResult[0].role
    
    if (adminRole === 'Super Admin' || adminRole === 'Admin') {
      roles.push('admin')
    }
    
    if (adminRole === 'Finance Manager' || adminRole === 'Admin' || adminRole === 'Super Admin') {
      roles.push('finance_manager')
    }
    
    return roles
  } catch (error) {
    logger.error('Failed to get user roles', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return []
  }
}
