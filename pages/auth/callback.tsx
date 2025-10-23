import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { logError } from '@/lib/audit';

const AuthCallback = () => {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          await logError(`Auth callback error: ${error.message}`, undefined, {
            error_code: error.message,
            url: window.location.href
          });
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          // Check if this is a new user who needs to complete profile
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', data.session.user.id)
            .single();

          if (userError || !userData) {
            // New user - redirect to complete profile
            router.replace('/signup/complete-profile');
          } else {
            // Existing user - redirect to dashboard
            router.replace('/dashboard');
          }
        } else {
          // No session, redirect to login
          router.replace('/login');
        }
      } catch (err: any) {
        console.error('Unexpected auth callback error:', err);
        await logError(`Unexpected auth callback error: ${err.message}`, undefined, {
          url: window.location.href
        });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, supabase]);

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
