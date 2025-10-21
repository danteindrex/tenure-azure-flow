# Complete Google OAuth Setup Guide

## ✅ What's Already Configured

Your application now has:
- Google OAuth integration in both login and signup pages
- Proper callback handling at `/auth/callback`
- Audit logging for Google OAuth events
- Correct redirect URIs configuration

## 🔧 Required Google Cloud Console Setup

### Step 1: Configure Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth 2.0 Client IDs"
6. Choose "Web application" as the application type
7. **Add these Authorized redirect URIs:**
   ```
   https://avduxpggzbnuqwkquuap.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   http://localhost:3000/dashboard
   ```
8. Copy your **Client ID** and **Client Secret**

### Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Authentication > Providers
3. Find "Google" and click "Configure"
4. Enable Google provider
5. Enter your Google OAuth credentials:
   - **Client ID**: `802187998033-men1psrig0lhtd9i4u61gg854ljr8a34.apps.googleusercontent.com`
   - **Client Secret**: `[Your Google Client Secret from Step 1]`
6. Save the configuration

## 🔑 Environment Variables

Create a `.env.local` file in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://avduxpggzbnuqwkquuap.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHV4cGdnemJudXF3a3F1dWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTY4MzAsImV4cCI6MjA3NjE3MjgzMH0.DTduVG-NuZUOuA44QE0A64uV-NCjpJJU0Bl_FevNgSI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHV4cGdnemJudXF3a3F1dWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU5NjgzMCwiZXhwIjoyMDc2MTcyODMwfQ._BvKnMl64yn7_8BogTIiN0sTv7bGMIbF2-CK-xAUmFY

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=802187998033-men1psrig0lhtd9i4u61gg854ljr8a34.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## 🚀 How It Works

1. **User clicks "Continue with Google"** on login/signup page
2. **Redirects to Google OAuth** with proper scopes and parameters
3. **User authenticates with Google** and grants permissions
4. **Google redirects back** to Supabase callback URL
5. **Supabase processes the OAuth** and creates/updates user
6. **Supabase redirects** to your `/auth/callback` page
7. **Your callback page** handles the session and redirects to dashboard
8. **Audit logs** are created for the authentication events

## 🔍 Testing

1. Start your development server: `npm run dev:next`
2. Go to `http://localhost:3000/login`
3. Click "Continue with Google"
4. Complete Google authentication
5. You should be redirected to the dashboard

## 📝 Authorized Redirect URIs Summary

Add these exact URLs to your Google OAuth configuration:

```
https://avduxpggzbnuqwkquuap.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
```

## 🛠️ Troubleshooting

### Common Issues:

1. **400 Bad Request**: Check that redirect URIs match exactly
2. **Invalid Client**: Verify Client ID is correct
3. **Redirect Mismatch**: Ensure all redirect URIs are added to Google Console
4. **Session Issues**: Check that Supabase is properly configured

### Debug Steps:

1. Check browser console for errors
2. Verify Supabase Auth settings
3. Confirm Google OAuth configuration
4. Test with different browsers/incognito mode

## ✅ Next Steps

1. Get your Google Client Secret from Google Cloud Console
2. Add it to your `.env.local` file
3. Configure Google provider in Supabase Dashboard
4. Test the authentication flow
5. Deploy and update production redirect URIs

Your Google OAuth integration is now ready to use! 🎉
