-- Check what actions exist in user_audit_logs table
SELECT DISTINCT action, COUNT(*) as count
FROM user_audit_logs
GROUP BY action
ORDER BY count DESC;

-- Show sample records
SELECT 
    id,
    user_id,
    action,
    entity_type,
    success,
    error_message,
    created_at
FROM user_audit_logs
ORDER BY created_at DESC
LIMIT 20;
