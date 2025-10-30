import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '@/lib/auth-client';
import { logError } from '@/lib/audit';

const AuthCallback = () => {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Wait for session to load
        if (isPending) {
          return;
        }

        if (!session?.user) {
          // No session, redirect to login
          router.replace('/login');
          return;
        }

        // Get user's onboarding status via API
        const response = await fetch('/api/onboarding/status', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`API failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(`API returned error: ${data.error}`);
        }
        const onboardingStatus = data.status;
        
        console.log('User onboarding status:', {
          userId: session.user.id,
          step: onboardingStatus.step,
          nextRoute: onboardingStatus.nextRoute,
          canAccessDashboard: onboardingStatus.canAccessDashboard
        });

        // Redirect to the appropriate step
        router.replace(onboardingStatus.nextRoute);

      } catch (err: any) {
        console.error('Auth callback error:', err);
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
