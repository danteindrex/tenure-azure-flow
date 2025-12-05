import { Request, Response, NextFunction } from 'express';
import { db } from '../../drizzle/db';
import { KYC_STATUS } from '../config/status-constants';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        authUserId: string | null;
      };
      userId?: string;
    }
  }
}

/**
 * Middleware to validate Better Auth session from cookies
 * Queries the shared database to verify session token
 */
export async function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('🔐 Auth Middleware - All cookies:', req.cookies);

    // Get session ID from cookie
    // Better Auth stores the session ID directly in the cookie
    // Try multiple possible cookie names
    const sessionCookie = req.cookies['better-auth.session_token'] ||
                          req.cookies['better_auth_session'] ||
                          req.cookies['authjs.session-token'] ||
                          req.cookies['__Secure-authjs.session-token'];

    console.log('🔑 Session cookie found:', sessionCookie ? 'Yes' : 'No');

    if (!sessionCookie) {
      console.log('❌ No session token in cookies');
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    // Better Auth uses signed tokens in format: token.signature
    // Extract just the token part (before the dot) to match what's stored in DB
    const sessionId = sessionCookie.split('.')[0];

    // Query session from shared database using Drizzle
    // The session token in the cookie matches session.token in the database
    console.log('🔍 Looking for session with token:', sessionId.substring(0, 20) + '...');

    const sessionRecord = await db.query.session.findFirst({
      where: (session, { eq }) => eq(session.token, sessionId)
    });

    console.log('📊 Session found:', sessionRecord ? 'Yes' : 'No');
    if (sessionRecord) {
      console.log('📊 Session user ID:', sessionRecord.userId);
    }

    if (!sessionRecord) {
      console.log('❌ Session not found in database with token:', sessionId);
      return res.status(401).json({
        success: false,
        error: 'Invalid session token'
      });
    }

    // Check if session expired
    const expiresAt = new Date(sessionRecord.expiresAt);
    if (expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Session expired'
      });
    }

    // Query user separately
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, sessionRecord.userId)
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user to request for use in controllers
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Optional: Middleware to check if user has completed KYC
 */
export async function requireKYCVerification(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user has verified KYC
    const kycRecord = await db.query.kycVerification.findFirst({
      where: (kyc, { eq, and }) =>
        and(
          eq(kyc.userId, req.userId),
          eq(kyc.status, KYC_STATUS.VERIFIED)
        )
    });

    if (!kycRecord) {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required'
      });
    }

    next();
  } catch (error) {
    console.error('KYC verification check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify KYC status'
    });
  }
}
