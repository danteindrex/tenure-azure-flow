import { Request, Response, NextFunction } from 'express';
import { db } from '../../drizzle/db';

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
    // Get session ID from cookie
    // Better Auth stores the session ID directly in the cookie
    const sessionId = req.cookies['better-auth.session_token'];

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    // Query session from shared database using Drizzle
    // The session ID in the cookie IS the session.id in the database
    const sessionRecord = await db.query.session.findFirst({
      where: (session, { eq }) => eq(session.id, sessionId)
    });

    if (!sessionRecord) {
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

// Note: requireKYCVerification middleware is intentionally not included here.
// KYC verification checks should only be performed in the KYC microservice.
// This service (Subscription Service) does not need to check KYC status.
