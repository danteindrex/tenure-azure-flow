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
 * Middleware to validate Better Auth session from cookies or Authorization header
 * Queries the shared database to verify session token
 */
export async function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('🔍 Validating session...');
    console.log('📝 Cookies received:', Object.keys(req.cookies));
    console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');

    // Try to get session token from cookie first
    let sessionToken = req.cookies['better-auth.session_token'];
    let userId: string | null = null;

    // If no cookie, check Authorization header as fallback (for service-to-service calls)
    if (!sessionToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('🔓 Using Authorization header with userId:', userId);
      }
    }

    if (!sessionToken && !userId) {
      console.log('❌ No session token in cookies or authorization header');
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    let user;

    // If we have a session token, validate it
    if (sessionToken) {
      console.log('🔑 Session token from cookie:', sessionToken);

      // Extract session token from signed cookie (format: "token.signature")
      // Better Auth signs the token, we need the part before the dot
      const token = sessionToken.split('.')[0];
      console.log('🔓 Extracted token:', token);

      // Query session from shared database using Drizzle
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

      userId = sessionRecord.userId;
    }

    // Query user by ID
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
    }

    user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId)
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

    console.log('✅ Session validated for user:', user.id);
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
