-- Add token column to admin_sessions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_sessions' AND column_name = 'token'
    ) THEN
        ALTER TABLE admin_sessions ADD COLUMN token TEXT NOT NULL UNIQUE;
        RAISE NOTICE 'Added token column to admin_sessions';
    ELSE
        RAISE NOTICE 'Token column already exists';
    END IF;
END $$;
