import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "@/lib/auth-client";
import DashboardLayout from "../../src/components/DashboardLayout";
import Settings from "../../src/pages/dashboard/Settings";
import { Loader2 } from "lucide-react";

export default function DashboardSettings() {
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
        const response = await fetch('/api/onboarding/status', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          router.replace('/login');
          return;
        }

        const data = await response.json();
        
        if (!data.status.canAccessDashboard) {
          router.replace(data.status.nextRoute);
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
      <Settings />
    </DashboardLayout>
  );
}