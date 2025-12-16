import { Request, Response, NextFunction } from 'express';
import { db } from '../../drizzle/db';
import { kycVerification } from '../../drizzle/schema';
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
    console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');

    // Try to get session token from cookie first
    let sessionToken = req.cookies['better-auth.session_token'] ||
                       req.cookies['better_auth_session'] ||
                       req.cookies['authjs.session-token'] ||
                       req.cookies['__Secure-authjs.session-token'];

    let userId: string | null = null;

    // If no cookie, check Authorization header as fallback (for service-to-service calls)
    if (!sessionToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('🔓 Using Authorization header with userId:', userId);
      } else {
        console.log('❌ Authorization header present but does not start with Bearer');
      }
    }

    if (!sessionToken && !userId) {
      console.log('❌ No session token in cookies or authorization header');
      console.log('   Cookies keys:', Object.keys(req.cookies));
      console.log('   Authorization header present:', !!req.headers.authorization);
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
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
      console.log('❌ No userId available after session validation');
      return res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
    }

    console.log('🔍 Querying user by ID:', userId);
    user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId)
    });

    console.log('👤 User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('   User email:', user.email);
    }

    if (!user) {
      console.log('❌ User not found in database for ID:', userId);
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
    console.error('Error stack:', error.stack);
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
          eq(kyc.kycStatusId, KYC_STATUS.VERIFIED)
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
