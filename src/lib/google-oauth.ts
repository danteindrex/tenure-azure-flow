// Google OAuth configuration and utilities
export const GOOGLE_CLIENT_ID = '802187998033-men1psrig0lhtd9i4u61gg854ljr8a34.apps.googleusercontent.com';

// Authorized redirect URIs for Google OAuth
export const GOOGLE_REDIRECT_URIS = [
  'https://avduxpggzbnuqwkquuap.supabase.co/auth/v1/callback',
  'http://localhost:3000/auth/callback',
  'http://localhost:3000/dashboard'
];

// Google OAuth scopes
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile'
].join(' ');

// Generate Google OAuth URL
export const generateGoogleAuthUrl = (redirectTo: string = '/dashboard') => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    state: redirectTo,
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// Handle Google OAuth callback
export const handleGoogleCallback = async (code: string, state: string) => {
  // This will be handled by Supabase's OAuth flow
  // The code will be exchanged for tokens by Supabase
  return { code, state };
};
