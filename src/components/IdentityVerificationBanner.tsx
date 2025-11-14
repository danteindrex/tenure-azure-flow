import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Shield } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { KYCVerificationModal } from "./KYCVerificationModal";

const IdentityVerificationBanner = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const { data: session } = useSession();

  // Check verification status function - defined outside useEffect so it can be called from multiple places
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

  // Check verification status on mount and when session changes
  useEffect(() => {
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
    // Open KYC verification modal
    setShowKYCModal(true);
  };

  const handleKYCSuccess = () => {
    // Refresh verification status after successful verification
    checkVerificationStatus();
    setShowKYCModal(false);
  };

  // Don't show banner if loading, dismissed, no session, or already verified
  if (loading || isDismissed || !session?.user || isVerified) {
    return null;
  }

  return (
    <>
      <div className="bg-red-600 border-l-4 border-red-700 text-white shadow-lg animate-in slide-in-from-top duration-500">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 sm:justify-between">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 pr-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-200 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                  <h4 className="font-semibold text-xs sm:text-sm">Identity Verification Required</h4>
                  <span className="px-1.5 py-0.5 sm:px-2 bg-red-700 text-red-100 text-[10px] sm:text-xs rounded-full font-medium animate-pulse">
                    Action Required
                  </span>
                </div>
                <p className="text-red-100 text-[11px] sm:text-sm leading-tight sm:leading-normal hidden sm:block">
                  To ensure account security and comply with regulations, please verify your identity.
                  This helps protect your account and enables full access to all features.
                </p>
                <p className="text-red-100 text-[11px] leading-tight sm:hidden">
                  Verify your identity to access all features.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-4 self-end sm:self-auto">
              <Button
                onClick={handleVerifyIdentity}
                size="sm"
                className="bg-white text-red-600 hover:bg-red-50 font-medium text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-auto"
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                <span className="hidden xs:inline ml-1">Verify Now</span>
                <span className="xs:hidden">Verify</span>
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-red-200 hover:text-white hover:bg-red-700 p-1 h-auto"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <KYCVerificationModal
        isOpen={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        onSuccess={handleKYCSuccess}
      />
    </>
  );
};

export default IdentityVerificationBanner;