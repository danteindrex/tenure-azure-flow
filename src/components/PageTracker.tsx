import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '@/lib/auth-client';
import { logPageVisit } from '@/lib/audit';

export default function PageTracker() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Log page visit with user context
      logPageVisit(url, session?.user?.id);
    };

    // Log initial page load
    if (router.isReady) {
      logPageVisit(router.asPath, session?.user?.id);
    }

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, session]);

  // This component doesn't render anything
  return null;
}
