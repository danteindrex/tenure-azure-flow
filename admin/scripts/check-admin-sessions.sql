-- Check if admin_sessions table exists and has data
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as non_expired_sessions
FROM admin_sessions;

-- Show all sessions (if any)
SELECT 
  id,
  admin_id,
  session_token,
  ip_address,
  user_agent,
  expires_at,
  last_activity,
  is_active,
  created_at
FROM admin_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Check if admin table exists and has records
SELECT COUNT(*) as total_admins FROM admin;

-- Show admin IDs to verify they match
SELECT id, email FROM admin LIMIT 5;
