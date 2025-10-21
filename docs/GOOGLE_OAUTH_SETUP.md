# Google OAuth Setup Instructions

## Prerequisites
1. A Google Cloud Console account
2. Access to your Supabase project dashboard

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - `https://avduxpggzbnuqwkquuap.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
   - Copy the **Client ID** and **Client Secret**

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Authentication > Providers
3. Find "Google" in the list and click on it
4. Toggle "Enable Google provider" to ON
5. Enter your Google OAuth credentials:
   - **Client ID**: Paste the Client ID from Google Cloud Console
   - **Client Secret**: Paste the Client Secret from Google Cloud Console
6. Click "Save"

## Step 3: Test the Integration

1. Start your development server: `npm run dev:next`
2. Navigate to `http://localhost:3000/login`
3. Click the "Google" button
4. You should be redirected to Google's OAuth consent screen
5. After authentication, you'll be redirected back to your dashboard

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**:
   - Ensure the redirect URI in Google Cloud Console exactly matches: `https://avduxpggzbnuqwkquuap.supabase.co/auth/v1/callback`

2. **"invalid_client" error**:
   - Double-check your Client ID and Client Secret in Supabase
   - Ensure the Google+ API is enabled in Google Cloud Console

3. **"access_denied" error**:
   - Check that your Google OAuth consent screen is properly configured
   - Ensure the app is not in testing mode with restricted users

### For Production:
- Update the authorized redirect URIs in Google Cloud Console to include your production domain
- Update the redirect URL in your code to use your production domain instead of localhost

## Security Notes:
- Never commit your Client Secret to version control
- Use environment variables for sensitive configuration
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Cloud Console
