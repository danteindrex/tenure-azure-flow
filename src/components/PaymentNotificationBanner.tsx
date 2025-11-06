import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, X, AlertTriangle, CheckCircle } from "lucide-react";
import { KYCVerificationModal } from "./KYCVerificationModal";

interface KYCStatus {
  status: string;
  verified: boolean;
  verifiedAt?: string;
}

const PaymentNotificationBanner = () => {
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kyc/status', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setKycStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKYCSuccess = () => {
    // Refresh KYC status after successful verification
    fetchKYCStatus();
    setShowKYCModal(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't show banner if loading, dismissed, or user is verified
  if (loading || isDismissed || kycStatus?.verified) {
    return null;
  }

  // Show KYC verification banner if not verified
  const needsKYC = kycStatus && !kycStatus.verified;

  if (!needsKYC) {
    return null;
  }

  return (
    <>
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
                onClick={() => setShowKYCModal(true)}
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

      <KYCVerificationModal
        isOpen={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        onSuccess={handleKYCSuccess}
      />
    </>
  );
};

export default PaymentNotificationBanner;
