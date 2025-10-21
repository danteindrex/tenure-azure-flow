import { createClient } from '@supabase/supabase-js';

class AuthMiddleware {
  constructor() {
    this.supabase = null;
    this.initializeSupabase();
  }

  initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // Middleware to verify JWT token from Supabase
  async verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!this.supabase) {
        return res.status(500).json({ error: 'Authentication service not configured' });
      }

      // Verify the JWT token
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Add user to request object for use in controllers
      req.user = user;
      next();

    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }

  // Middleware for admin-only endpoints
  async requireAdmin(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user has admin role (you can customize this logic)
      const { data: member, error } = await this.supabase
        .from('member')
        .select('role, status')
        .eq('auth_user_id', req.user.id)
        .single();

      if (error || !member) {
        return res.status(403).json({ error: 'Access denied - member not found' });
      }

      if (member.role !== 'admin' && member.role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied - admin privileges required' });
      }

      next();

    } catch (error) {
      console.error('Admin middleware error:', error);
      return res.status(403).json({ error: 'Access verification failed' });
    }
  }

  // Optional auth middleware (allows both authenticated and unauthenticated requests)
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        if (this.supabase) {
          const { data: { user }, error } = await this.supabase.auth.getUser(token);

          if (!error && user) {
            req.user = user;
          }
        }
      }

      next();

    } catch (error) {
      // Continue without authentication if optional
      next();
    }
  }
}

const authMiddleware = new AuthMiddleware();

export default authMiddleware;