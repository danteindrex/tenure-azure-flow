-- Add sample addresses for existing users
-- This will add one address per user if they don't already have one

-- First, check which users don't have addresses
WITH users_without_addresses AS (
  SELECT u.id, u.name, u.email
  FROM users u
  LEFT JOIN user_addresses ua ON u.id = ua.user_id
  WHERE ua.id IS NULL
  LIMIT 10
)
-- Insert sample addresses for users without addresses
INSERT INTO user_addresses (
  user_id,
  address_line_1,
  address_line_2,
  city,
  state,
  postal_code,
  country,
  address_type,
  is_primary
)
SELECT 
  id,
  CASE 
    WHEN ROW_NUMBER() OVER () % 5 = 0 THEN '123 Main Street'
    WHEN ROW_NUMBER() OVER () % 5 = 1 THEN '456 Oak Avenue'
    WHEN ROW_NUMBER() OVER () % 5 = 2 THEN '789 Pine Road'
    WHEN ROW_NUMBER() OVER () % 5 = 3 THEN '321 Elm Boulevard'
    ELSE '654 Maple Drive'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER () % 3 = 0 THEN 'Apt 101'
    WHEN ROW_NUMBER() OVER () % 3 = 1 THEN 'Suite 200'
    ELSE NULL
  END,
  CASE 
    WHEN ROW_NUMBER() OVER () % 4 = 0 THEN 'New York'
    WHEN ROW_NUMBER() OVER () % 4 = 1 THEN 'Los Angeles'
    WHEN ROW_NUMBER() OVER () % 4 = 2 THEN 'Chicago'
    ELSE 'Houston'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER () % 4 = 0 THEN 'NY'
    WHEN ROW_NUMBER() OVER () % 4 = 1 THEN 'CA'
    WHEN ROW_NUMBER() OVER () % 4 = 2 THEN 'IL'
    ELSE 'TX'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER () % 4 = 0 THEN '10001'
    WHEN ROW_NUMBER() OVER () % 4 = 1 THEN '90001'
    WHEN ROW_NUMBER() OVER () % 4 = 2 THEN '60601'
    ELSE '77001'
  END,
  'United States',
  'home',
  true
FROM users_without_addresses;

-- Verify the addresses were added
SELECT 
  u.name,
  u.email,
  ua.address_line_1,
  ua.address_line_2,
  ua.city,
  ua.state,
  ua.postal_code,
  ua.country
FROM user_addresses ua
JOIN users u ON ua.user_id = u.id
ORDER BY ua.created_at DESC
LIMIT 10;
