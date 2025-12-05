import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '@/lib/auth-client';
import { logError } from '@/lib/audit';
import { Loader2, Crown } from 'lucide-react';

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
          // Use window.location to avoid Next.js router invariant error
          window.location.href = '/login';
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
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="text-center relative z-10 space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-10 h-10 text-accent animate-pulse" />
            <span className="text-3xl font-bold text-foreground">Home Solutions</span>
          </div>

          {/* Main Spinner */}
          <div className="relative">
            <div className="w-24 h-24 mx-auto mb-6">
              <Loader2 className="w-24 h-24 text-accent animate-spin" />
            </div>

            {/* Pulsing Ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-accent/20 animate-ping" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">Completing Authentication</h1>
            <p className="text-muted-foreground text-lg">
              Setting up your account...
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
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
            onClick={() => { window.location.href = '/login'; }}
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
