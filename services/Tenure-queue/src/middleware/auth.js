const database = require('../config/database');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For Better Auth, we'll validate the user ID directly
    // The main app will send the user ID as the token
    if (!token || token.length < 10) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    // Verify the user exists in our database
    const supabase = database.getClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', token)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin role
    const supabase = database.getClient();
    const { data: member, error } = await supabase
      .from('member')
      .select('role, status')
      .eq('id', req.user.id)
      .single();

    if (error || !member || member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      message: error.message
    });
  }
};

module.exports = {
  authenticateUser,
  requireAdmin
};