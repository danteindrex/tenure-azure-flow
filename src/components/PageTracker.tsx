import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { logPageVisit } from '@/lib/audit';

export default function PageTracker() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const userData = useUser();
  const user = userData?.user;

  useEffect(() => {
    // Store the Supabase client globally to avoid multiple instances
    if (typeof window !== 'undefined') {
      (window as any).__supabaseClient = supabase;
    }

    const handleRouteChange = (url: string) => {
      // Log page visit with user context
      logPageVisit(url, user?.id);
    };

    // Log initial page load
    if (router.isReady) {
      logPageVisit(router.asPath, user?.id);
    }

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, user, supabase]);

  // This component doesn't render anything
  return null;
}
