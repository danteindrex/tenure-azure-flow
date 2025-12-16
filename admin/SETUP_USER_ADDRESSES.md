# Setup User Addresses

## Issue
User addresses are not showing on user profile cards because the `user_addresses` table either doesn't exist or has no data.

## Quick Fix - Run This SQL

Copy and paste this into your Supabase SQL Editor:

```sql
-- Step 1: Create the user_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  address_type VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- Step 3: Add sample addresses for all users
INSERT INTO user_addresses (user_id, address_line1, city, state, postal_code, country, address_type, is_primary)
SELECT 
  id,
  '123 Main Street',
  'Kampala',
  'Central Region',
  '00256',
  'Uganda',
  'home',
  true
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_addresses ua WHERE ua.user_id = users.id
);

-- Step 4: Verify the data
SELECT 
  u.email,
  u.name,
  ua.address_line1,
  ua.city,
  ua.state,
  ua.postal_code,
  ua.country
FROM user_addresses ua
JOIN users u ON ua.user_id = u.id
ORDER BY u.email
LIMIT 20;
```

## After Running

1. Refresh your browser (Ctrl+Shift+R)
2. Go to http://localhost:3000/users
3. Click on a user profile
4. You should see the address displayed in the "Location & Personal Information" section

## Expected Display

```
Location & Personal Information
┌─────────────────────────────────────────────────────────┐
│ Address: 123 Main Street, Kampala, Central Region,     │
│          00256, Uganda                                  │
│ Role: User                                              │
└─────────────────────────────────────────────────────────┘
```

## Add Custom Addresses

To add a specific address for a specific user:

```sql
INSERT INTO user_addresses (
  user_id, 
  address_line1, 
  address_line2,
  city, 
  state, 
  postal_code, 
  country, 
  address_type,
  is_primary
)
SELECT 
  id,
  '123 Main Street',
  'Apt 4B',
  'Kampala',
  'Central Region',
  '00256',
  'Uganda',
  'home',
  true
FROM users
WHERE email = 'user@example.com';  -- Replace with actual email
```

## Data Format

The `user_addresses` table stores addresses like this:

| user_id | address_line1 | city | state | postal_code | country | is_primary |
|---------|---------------|------|-------|-------------|---------|------------|
| uuid-1  | 123 Main St   | Kampala | Central | 00256 | Uganda | true |
| uuid-2  | 456 Oak Ave   | Entebbe | Central | 00257 | Uganda | true |

## How the API Formats Addresses

The API combines address fields into a single string:
```
address_line1, address_line2, city, state, postal_code, country
```

Example output:
- `"123 Main Street, Kampala, Central Region, 00256, Uganda"`
- `"456 Oak Avenue, Apt 4B, Entebbe, Central Region, 00257, Uganda"`

Empty fields are automatically filtered out.

## Troubleshooting

### If addresses still don't show:

1. **Check if table exists**:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'user_addresses'
   );
   ```

2. **Check if data exists**:
   ```sql
   SELECT COUNT(*) FROM user_addresses;
   ```

3. **Check API response**:
   - Open DevTools > Network tab
   - Click on `/api/users` request
   - Look for the `address` field in the response

4. **Check server logs**:
   Look for errors like "Error fetching addresses"

5. **Hard refresh**:
   Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)

## Multiple Addresses

Users can have multiple addresses (home, work, billing, etc.):
- The API prioritizes addresses where `is_primary = true`
- If no primary address, it uses the first address found
- Only one address is displayed on the user card

To set a different address as primary:
```sql
-- Unset all primary flags for user
UPDATE user_addresses 
SET is_primary = false 
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');

-- Set specific address as primary
UPDATE user_addresses 
SET is_primary = true 
WHERE id = 'address-uuid-here';
```
