import { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Loader2 } from 'lucide-react';

// Type declarations for Sumsub WebSDK
declare global {
  interface Window {
    snsWebSdk: any;
  }
}

interface KYCVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function KYCVerificationModal({
  isOpen,
  onClose,
  onSuccess,
}: KYCVerificationModalProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [provider, setProvider] = useState<'plaid' | 'sumsub' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sumsubInstance, setSumsubInstance] = useState<any>(null);
  const { toast } = useToast();

  // Fetch token when modal opens
  useEffect(() => {
    if (isOpen && !linkToken && !accessToken) {
      fetchToken();
    }
  }, [isOpen]);

  // Load Sumsub WebSDK when needed
  useEffect(() => {
    if (provider === 'sumsub' && accessToken && !sumsubInstance) {
      loadSumsubSDK();
    }
  }, [provider, accessToken]);

  const fetchToken = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/kyc/create-link-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create verification token');
      }

      const tokenData = data.data;

      if (tokenData.provider === 'sumsub') {
        setAccessToken(tokenData.accessToken);
        setProvider('sumsub');
      } else {
        // Default to Plaid
        setLinkToken(tokenData.linkToken);
        setProvider('plaid');
      }
    } catch (error: any) {
      console.error('Error fetching verification token:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize verification. Please try again.',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const loadSumsubSDK = async () => {
    try {
      // Load Sumsub WebSDK script if not already loaded
      if (!window.snsWebSdk) {
        const script = document.createElement('script');
        script.src = 'https://websdk.sumsub.com/websdk.js';
        script.async = true;
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Initialize Sumsub WebSDK
      const instance = window.snsWebSdk.init(
        accessToken,
        () => getNewAccessToken()
      )
      .withConf({
        lang: 'en',
      })
      .on('onError', (error: any) => {
        console.log('Sumsub onError:', error);
        toast({
          title: 'Verification Error',
          description: 'An error occurred during verification. Please try again.',
          variant: 'destructive',
        });
        onClose();
      })
      .onMessage((type: string, payload: any) => {
        console.log('Sumsub onMessage:', type, payload);

        if (type === 'idCheck.onApplicantSubmitted') {
          handleSumsubSuccess(payload);
        }
      })
      .build();

      setSumsubInstance(instance);
    } catch (error) {
      console.error('Error loading Sumsub SDK:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification system. Please try again.',
        variant: 'destructive',
      });
      onClose();
    }
  };

  const getNewAccessToken = async () => {
    // This function should return a Promise that resolves to a new access token
    await fetchToken();
    return accessToken;
  };

  const handleSumsubSuccess = async (payload: any) => {
    try {
      setIsVerifying(true);

      const applicantId = payload.applicantId;

      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicantId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify identity');
      }

      toast({
        title: 'Verification Successful',
        description: 'Your identity has been verified successfully!',
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Error verifying KYC:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to complete verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePlaidSuccess = async (public_token: string, metadata: any) => {
    try {
      setIsVerifying(true);

      // The metadata contains the identity_verification_id (session ID)
      const sessionId = metadata.link_session_id;

      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify identity');
      }

      toast({
        title: 'Verification Successful',
        description: 'Your identity has been verified successfully!',
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Error verifying KYC:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to complete verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePlaidExit = (error: any, metadata: any) => {
    if (error) {
      console.error('Plaid Link error:', error);
      toast({
        title: 'Verification Cancelled',
        description: 'Identity verification was cancelled or failed.',
        variant: 'destructive',
      });
    }
    onClose();
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: handlePlaidExit,
  });

  const handleStartVerification = () => {
    if (provider === 'sumsub' && sumsubInstance) {
      // Launch Sumsub WebSDK
      const container = document.getElementById('sumsub-websdk-container');
      if (container) {
        sumsubInstance.launch('#sumsub-websdk-container');
      }
    } else if (provider === 'plaid' && ready) {
      // Launch Plaid Link
      open();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <DialogTitle>Identity Verification</DialogTitle>
          </div>
          <DialogDescription>
            Complete identity verification to access all features and ensure account security.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-sm">
            <p className="font-medium">What you'll need:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Government-issued ID (passport, driver's license, or national ID)</li>
              <li>Access to your device camera</li>
              <li>2-3 minutes to complete</li>
            </ul>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              <strong>Secure & Private:</strong> Your information is encrypted and verified by
              our trusted partner{provider === 'sumsub' ? ', Sumsub' : ', Plaid'}. We never store your ID images.
            </p>
          </div>

          {/* Sumsub WebSDK Container */}
          {provider === 'sumsub' && (
            <div id="sumsub-websdk-container" className="min-h-[400px] border rounded-lg"></div>
          )}

          <Button
            onClick={handleStartVerification}
            disabled={
              (provider === 'plaid' && !ready) ||
              (provider === 'sumsub' && !sumsubInstance) ||
              isLoading ||
              isVerifying
            }
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Start Verification
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to share your identity information for verification purposes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
