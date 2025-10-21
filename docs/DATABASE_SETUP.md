# Database Schema Setup Guide

This guide will help you set up the Supabase database schema for the Tenure application.

## Prerequisites

- Access to your Supabase project dashboard
- Supabase project URL and API keys (already configured in `.env.local`)

## Quick Setup (Minimal Schema)

For basic login/signup functionality, use the minimal schema:

### 1. Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Run the Minimal Schema

Copy and paste the contents of `supabase-minimal-schema.sql` into the SQL editor and run it.

This will create:
- `profiles` table (required by frontend)
- Automatic profile creation trigger
- Row Level Security policies

### 3. Verify Setup

Run the test script to verify everything works:

```bash
node test-schema.js
```

## Complete Setup (Full Schema)

For the complete application with all business logic, use the full schema:

### 1. Run the Complete Schema

Copy and paste the contents of `supabase-schema.sql` into the SQL editor and run it.

This will create:
- `profiles` table (frontend compatibility)
- `admin` table (administrative users)
- `member` table (business logic)
- `tenure` table (tenure tracking)
- `payment` table (payment records)
- `payout` table (reward payouts)
- `news_feed_post` table (announcements)
- `audit_log` table (system audit trail)
- All necessary triggers and policies

## What Each Schema Does

### Minimal Schema (`supabase-minimal-schema.sql`)

**Purpose**: Enables basic login/signup functionality

**Tables Created**:
- `profiles` - User profile information linked to Supabase auth

**Features**:
- Automatic profile creation when users sign up
- Row Level Security (RLS) for data protection
- Compatible with frontend `/api/profiles/upsert` endpoint

### Complete Schema (`supabase-schema.sql`)

**Purpose**: Full application with business logic

**Tables Created**:
- `profiles` - User profiles (frontend compatibility)
- `admin` - Administrative users
- `member` - Program members with business data
- `tenure` - Tenure period tracking
- `payment` - Payment transaction records
- `payout` - Reward payout tracking
- `news_feed_post` - News and announcements
- `audit_log` - System audit trail

**Features**:
- Complete business logic implementation
- Automatic data synchronization between auth and business tables
- Comprehensive audit logging
- Row Level Security for all tables

## Troubleshooting

### Common Issues

1. **"Database error saving new user"**
   - This means the schema hasn't been applied yet
   - Run the minimal schema first

2. **"relation 'public.profiles' does not exist"**
   - The profiles table wasn't created
   - Check the SQL execution logs for errors

3. **"Auth session missing!"**
   - This is expected for the profiles API without authentication
   - Test with actual user login first

### Verification Steps

1. **Check Tables Exist**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Check Triggers**:
   ```sql
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_schema = 'public';
   ```

3. **Test User Creation**:
   ```sql
   SELECT * FROM auth.users LIMIT 1;
   SELECT * FROM public.profiles LIMIT 1;
   ```

## Next Steps

After applying the schema:

1. **Test Login**: Visit `http://localhost:3000/login`
2. **Test Signup**: Visit `http://localhost:3000/signup`
3. **Verify Data**: Check that user data appears in the profiles table
4. **Test API**: Verify the profiles API works with authentication

## Schema Files

- `supabase-minimal-schema.sql` - Basic schema for login/signup
- `supabase-schema.sql` - Complete schema with business logic
- `test-schema.js` - Test script to verify functionality

## Support

If you encounter issues:

1. Check the Supabase logs in the dashboard
2. Verify your environment variables are correct
3. Ensure the SQL executed without errors
4. Test with the provided test script

The minimal schema should resolve the "Database error saving new user" issue and enable full login/signup functionality.
