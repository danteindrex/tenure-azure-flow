import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/router";

const Suspended = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-red-600">Account Suspended</h1>
          <p className="text-muted-foreground">
            Your account has been suspended by an administrator.
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact support for assistance.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = 'mailto:support@example.com'}
            className="w-full"
          >
            Contact Support
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/api/auth/sign-out')}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Suspended;
