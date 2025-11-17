import { Request, Response, NextFunction } from 'express';
import { db } from '../../drizzle/db';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
      };
      userId?: string;
    }
  }
}

/**
 * Middleware to validate Better Auth session from cookies
 * Extracts token from cookie and queries the shared database
 */
export async function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionToken = req.cookies['better-auth.session_token'];
    const authHeader = req.headers.authorization;

    let userId: string | null = null;
    let sessionRecord: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = authHeader.substring(7);
    }

    if (!userId) {
      if (!sessionToken) {
        return res.status(401).json({
          success: false,
          error: 'No session token or authorization provided'
        });
      }

      const token = sessionToken.split('.')[0];
      sessionRecord = await db.query.session.findFirst({
        where: (session, { eq }) => eq(session.token, token)
      });

      if (!sessionRecord) {
        return res.status(401).json({
          success: false,
          error: 'Invalid session token'
        });
      }

      const expiresAt = new Date(sessionRecord.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(401).json({
          success: false,
          error: 'Session expired'
        });
      }

      userId = sessionRecord.userId;
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId as string)
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user to request for use in controllers
    req.user = {
      id: user.id,
      email: user.email,
      name: user.email, // users table doesn't have name field, use email
      emailVerified: user.emailVerified
    };
    req.userId = user.id;

    console.log('✅ Session validated for user:', user.id);
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

// Note: requireKYCVerification middleware is intentionally not included here.
// KYC verification checks should only be performed in the KYC microservice.
// This service (Tenure-Queue Service) does not need to check KYC status.
