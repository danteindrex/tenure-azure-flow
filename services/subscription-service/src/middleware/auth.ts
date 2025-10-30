import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For Better Auth, we'll validate the user ID directly
    // The main app will send the user ID as the token
    if (!token || token.length < 10) {
      res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
      return;
    }

    // Verify the user exists in our database
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email FROM users WHERE id = $1',
        [token]
      );

      if (result.rows.length === 0) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
        return;
      }

      req.user = result.rows[0];
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};