# Queue Table Setup Instructions

## Problem
The queue dashboard at `http://localhost:3000/dashboard/queue` is showing "Failed to load queue data" because the `queue` table doesn't exist in the database.

## Solution
You need to create the `queue` table in your Supabase database.

## Steps to Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `exneyqwvvckzxqzlknxv`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Create the Queue Table**
   - Copy the entire contents of `create-queue-table.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the script

### Option 2: Using the Command Line

1. **Install dependencies** (if not already done):
   ```bash
   npm install dotenv
   ```

2. **Run the setup script**:
   ```bash
   node setup-queue.js
   ```

## What the Queue Table Does

The `queue` table tracks:
- Member positions in the tenure queue
- Subscription status and eligibility
- Payment history and totals
- Payout status
- Join dates and notes

## After Setup

Once the table is created:
1. The queue dashboard will work properly
2. Members will be automatically added to the queue when they sign up
3. You can view real queue data instead of mock data

## Verification

To verify the table was created successfully:
1. Go to Supabase Dashboard → Table Editor
2. Look for the `queue` table in the list
3. Check that it has the expected columns

## Troubleshooting

If you still see errors:
1. Check the browser console for specific error messages
2. Verify the table was created with the correct schema
3. Ensure Row Level Security (RLS) policies are set up correctly
4. Check that the `member` table exists and has data

## Mock Data

Until the table is created, the dashboard will show mock data for demonstration purposes. This includes:
- 2 sample members with different queue positions
- Sample payment and subscription data
- All dashboard features working with demo data
