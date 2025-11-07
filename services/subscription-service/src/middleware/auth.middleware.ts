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
    // Get session token from cookie
    // Better Auth stores a SIGNED token: "sessionId.signature"
    const sessionToken = req.cookies['better-auth.session_token'];

    console.log('🔍 Validating session...');
    console.log('📝 Cookies received:', Object.keys(req.cookies));
    console.log('🔑 Session token from cookie:', sessionToken);

    if (!sessionToken) {
      console.log('❌ No session token in cookies');
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    // Extract session token from signed cookie (format: "token.signature")
    // Better Auth signs the token, we need the part before the dot
    const token = sessionToken.split('.')[0];
    console.log('🔓 Extracted token:', token);

    // Query session from shared database using Drizzle
    // Better Auth uses the 'token' field for authentication, not 'id'
    console.log('🔍 Querying session table by token:', token);

    const sessionRecord = await db.query.session.findFirst({
      where: (session, { eq }) => eq(session.token, token)
    });

    console.log('📋 Session found:', sessionRecord ? 'Yes' : 'No');
    if (sessionRecord) {
      console.log('   User ID:', sessionRecord.userId);
      console.log('   Expires:', sessionRecord.expiresAt);
    }

    if (!sessionRecord) {
      console.log('❌ Session not found in database');
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
