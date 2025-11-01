import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, authClient } from '@/lib/auth-client';
import { logError } from '@/lib/audit';

const AuthCallback = () => {
  const router = useRouter();
  const { data: session, isPending, refetch } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRefreshed, setHasRefreshed] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Wait for session to load
        if (isPending) {
          console.log('⏳ Waiting for session to load...');
          return;
        }

        // If no session and we haven't refreshed yet, force a session refresh
        // This clears the cache and fetches the new session from the server
        if (!session?.user && !hasRefreshed) {
          console.log('🔄 No cached session, forcing refresh to get new OAuth session...');
          setHasRefreshed(true);

          // Wait a bit for Better Auth to finish setting cookies
          await new Promise(resolve => setTimeout(resolve, 500));

          // Force refetch the session
          await refetch();
          return;
        }

        if (!session?.user) {
          // No session even after refresh, redirect to login
          console.log('❌ No session found after refresh, redirecting to login');
          router.replace('/login');
          return;
        }

        console.log('✅ Session found:', {
          userId: session.user.id,
          email: session.user.email,
          emailVerified: session.user.emailVerified
        });

        // Get user's onboarding status via API
        console.log('📡 Fetching onboarding status...');
        const response = await fetch('/api/onboarding/status', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API error:', response.status, errorText);
          throw new Error(`API failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          console.error('❌ API returned error:', data.error);
          throw new Error(`API returned error: ${data.error}`);
        }
        const onboardingStatus = data.status;

        console.log('📋 User onboarding status:', {
          userId: session.user.id,
          step: onboardingStatus.step,
          nextRoute: onboardingStatus.nextRoute,
          canAccessDashboard: onboardingStatus.canAccessDashboard,
          isEmailVerified: onboardingStatus.isEmailVerified,
          hasProfile: onboardingStatus.hasProfile
        });

        // Redirect to the appropriate step
        // If redirecting to signup, add oauth=true parameter to trigger name pre-filling
        let redirectUrl = onboardingStatus.nextRoute;
        if (redirectUrl.startsWith('/signup')) {
          const url = new URL(redirectUrl, window.location.origin);
          url.searchParams.set('oauth', 'true');
          redirectUrl = url.pathname + url.search;
          console.log('🔀 Redirecting to signup with OAuth parameter:', redirectUrl);
        } else {
          console.log('🔀 Redirecting to:', redirectUrl);
        }

        router.replace(redirectUrl);

      } catch (err: any) {
        console.error('❌ Auth callback error:', err);
        await logError(`Auth callback error: ${err.message}`, session?.user?.id, {
          url: window.location.href,
          error: err.message
        });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, session, isPending]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-destructive mb-4">Authentication Error</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => router.replace('/login')}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
