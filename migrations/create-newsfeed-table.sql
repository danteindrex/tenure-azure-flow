-- =====================================================
-- Create Newsfeed Posts Table
-- =====================================================
-- This table stores news posts and announcements for members
-- Created to support the /api/newsfeed/posts endpoint
-- =====================================================

CREATE TABLE IF NOT EXISTS newsfeedposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  publish_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status VARCHAR(20) DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsfeedposts_user_id ON newsfeedposts(user_id);
CREATE INDEX IF NOT EXISTS idx_newsfeedposts_publish_date ON newsfeedposts(publish_date);
CREATE INDEX IF NOT EXISTS idx_newsfeedposts_status ON newsfeedposts(status);
CREATE INDEX IF NOT EXISTS idx_newsfeedposts_status_publish ON newsfeedposts(status, publish_date DESC);

-- Add comments for documentation
COMMENT ON TABLE newsfeedposts IS 'News posts and announcements created by admins for members';
COMMENT ON COLUMN newsfeedposts.user_id IS 'Admin/user who created the post (references users table)';
COMMENT ON COLUMN newsfeedposts.publish_date IS 'Date/time when post should be published (can be future-dated)';
COMMENT ON COLUMN newsfeedposts.status IS 'Publication status: Draft, Published, or Archived';
COMMENT ON COLUMN newsfeedposts.priority IS 'Display priority: low, medium, high, or urgent';

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_newsfeedposts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_newsfeedposts_updated_at ON newsfeedposts;
CREATE TRIGGER trigger_update_newsfeedposts_updated_at
    BEFORE UPDATE ON newsfeedposts
    FOR EACH ROW
    EXECUTE FUNCTION update_newsfeedposts_updated_at();

-- Insert sample posts (optional - for testing)
INSERT INTO newsfeedposts (title, content, status, priority, publish_date) VALUES
  (
    'Welcome to Home Solutions!',
    'We''re excited to have you as a member. Your journey to winning $100,000 starts here!',
    'Published',
    'high',
    NOW()
  ),
  (
    'How the Queue System Works',
    'Members are ranked by tenure length. The longer you maintain your membership, the higher your position!',
    'Published',
    'medium',
    NOW() - INTERVAL '1 day'
  ),
  (
    'Payment Reminder',
    'Keep your payments current to maintain your queue position. Grace period is 30 days.',
    'Published',
    'medium',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify table creation
SELECT 'Newsfeed table created successfully!' as status;
SELECT COUNT(*) as sample_posts_inserted FROM newsfeedposts;
