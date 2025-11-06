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
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  // Fetch link token when modal opens
  useEffect(() => {
    if (isOpen && !linkToken) {
      fetchLinkToken();
    }
  }, [isOpen]);

  const fetchLinkToken = async () => {
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
        throw new Error(data.error || 'Failed to create link token');
      }

      setLinkToken(data.data.linkToken);
    } catch (error: any) {
      console.error('Error fetching link token:', error);
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
    if (ready) {
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
              our trusted partner, Plaid. We never store your ID images.
            </p>
          </div>

          <Button
            onClick={handleStartVerification}
            disabled={!ready || isLoading || isVerifying}
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
