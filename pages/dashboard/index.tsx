import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useSession } from "@/lib/auth-client";
import DashboardLayout from "../../src/components/DashboardLayout";
import DashboardSimple from "../../src/pages/DashboardSimple";
import { Loader2 } from "lucide-react";

export default function DashboardIndex() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    const checkAccess = async () => {
      if (isPending) return;

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      try {
        // Check user status via API
        const response = await fetch('/api/onboarding/status', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          router.replace('/login');
          return;
        }

        const data = await response.json();
        
        // If user can't access dashboard, redirect to appropriate step
        if (!data.status.canAccessDashboard) {
          router.replace(data.status.nextRoute);
          return;
        }

      } catch (error) {
        console.error('Error checking dashboard access:', error);
        router.replace('/login');
      }
    };

    checkAccess();
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | Tenure</title>
        <meta name="description" content="Overview of your Tenure account." />
      </Head>
      <DashboardSimple />
    </DashboardLayout>
  );
}