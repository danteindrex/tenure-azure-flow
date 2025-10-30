import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Shield } from "lucide-react";
import { useSession } from "@/lib/auth-client";

const IdentityVerificationBanner = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  // Check verification status and dismissal state
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has completed identity verification
        const response = await fetch('/api/auth/check-user-status', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setIsVerified(data.isVerified || false);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }

      // Check if banner was previously dismissed for this session
      const dismissedKey = `identity-verification-banner-dismissed-${session.user.id}`;
      const dismissed = sessionStorage.getItem(dismissedKey);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }

      setLoading(false);
    };

    checkVerificationStatus();
  }, [session?.user]);

  const handleDismiss = () => {
    if (!session?.user) return;
    
    setIsDismissed(true);
    // Store dismissal per user session (not persistent across browser sessions)
    const dismissedKey = `identity-verification-banner-dismissed-${session.user.id}`;
    sessionStorage.setItem(dismissedKey, 'true');
  };

  const handleVerifyIdentity = () => {
    // Redirect to identity verification process
    window.location.href = '/dashboard/profile?tab=verification';
  };

  // Don't show banner if loading, dismissed, no session, or already verified
  if (loading || isDismissed || !session?.user || isVerified) {
    return null;
  }

  return (
    <div className="bg-red-600 border-l-4 border-red-700 text-white shadow-lg animate-in slide-in-from-top duration-500">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-200 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">Identity Verification Required</h4>
                <span className="px-2 py-0.5 bg-red-700 text-red-100 text-xs rounded-full font-medium animate-pulse">
                  Action Required
                </span>
              </div>
              <p className="text-red-100 text-sm">
                To ensure account security and comply with regulations, please verify your identity. 
                This helps protect your account and enables full access to all features.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              onClick={handleVerifyIdentity}
              size="sm"
              className="bg-white text-red-600 hover:bg-red-50 font-medium"
            >
              <Shield className="w-4 h-4 mr-1" />
              Verify Now
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-red-200 hover:text-white hover:bg-red-700 p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityVerificationBanner;