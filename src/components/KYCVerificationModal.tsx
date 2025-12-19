'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from '@/lib/auth-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StepIndicator } from './KYCVerificationModal/StepIndicator';
import { DocumentUploadForm } from './KYCVerificationModal/DocumentUploadForm';
import { LivenessCheckForm } from './KYCVerificationModal/LivenessCheckForm';
import QRCode from 'qrcode';


interface KYCVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type VerificationStep = 'device-choice' | 'document-upload' | 'liveness-check' | 'phone-verification';

export function KYCVerificationModal({
  isOpen,
  onClose,
  onSuccess,
}: KYCVerificationModalProps) {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('device-choice');
  const [applicantId, setApplicantId] = useState<string>('');

  const [isCreatingApplicant, setIsCreatingApplicant] = useState(false);
  const [hostedUrl, setHostedUrl] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const user = session?.user;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('device-choice');
      setApplicantId('');
      setHostedUrl('');
      setShowSuccessMessage(false);
    }
  }, [isOpen]);

  const createApplicant = async () => {
    if (!user?.id) {
      console.log('❌ No user ID available');
      toast({
        title: 'Error',
        description: 'User not authenticated. Please log in again.',
        variant: 'destructive',
      });
      onClose();
      return;
    }

    console.log('🚀 Starting applicant creation for user:', user.id);
    setIsCreatingApplicant(true);

    try {
      // Fetch user profile data for personal information
      const profileResponse = await fetch('/api/profiles/me', {
        method: 'GET',
        credentials: 'include'
      });

      let profileData = {};
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        if (profile.success && profile.data) {
          profileData = {
            firstName: profile.data.firstName,
            lastName: profile.data.lastName,
            dob: profile.data.dateOfBirth,
          };
        }
      }

      // Fetch user address for country information
      const addressResponse = await fetch('/api/user/addresses', {
        method: 'GET',
        credentials: 'include'
      });

      let country = 'US'; // Default
      if (addressResponse.ok) {
        const addresses = await addressResponse.json();
        if (addresses.success && addresses.data?.length > 0) {
          country = addresses.data[0].countryCode || 'US';
        }
      }

      console.log('📡 Making API call to /api/kyc/create-applicant');
      const response = await fetch('/api/kyc/create-applicant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          ...profileData,
          country,
        }),
      });

      console.log('📥 API Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 API Response data:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || `API error: ${response.status} ${response.statusText}`);
      }

      if (!data.data?.id) {
        throw new Error('No applicant ID returned from API');
      }

      console.log('✅ Applicant created successfully:', data.data.id);
      setApplicantId(data.data.id);
    } catch (error: any) {
      console.error('❌ Error creating applicant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize verification. Please try again.',
        variant: 'destructive',
      });
      onClose();
    } finally {
      console.log('🏁 Setting isCreatingApplicant to false');
      setIsCreatingApplicant(false);
    }
  };

  const handleChooseWeb = () => {
    setCurrentStep('document-upload');
    createApplicant();
  };

  const handleChoosePhone = async () => {
    setIsCreatingApplicant(true);
    try {
      const response = await fetch('/api/kyc/generate-hosted-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate hosted link');
      }

      const data = await response.json();
      setHostedUrl(data.url);

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);

      setCurrentStep('phone-verification');
    } catch (error: any) {
      console.error('Error generating hosted link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate phone verification link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingApplicant(false);
    }
  };

  const handleDocumentComplete = () => {
    setCurrentStep('liveness-check');
  };

  const handleLivenessComplete = () => {
    // Show success message for 2 seconds before closing
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
      onClose();
      onSuccess?.();
    }, 2000);
  };



  const handleBack = () => {
    if (currentStep === 'liveness-check') {
      setCurrentStep('document-upload');
    }
  };

  const getStepNumber = (): number => {
    switch (currentStep) {
      case 'device-choice': return 0;
      case 'phone-verification': return 0;
      case 'document-upload': return 1;
      case 'liveness-check': return 2;
      default: return 1;
    }
  };

  const renderCurrentStep = () => {
    if (showSuccessMessage) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">Sent verification request</p>
            <p className="text-gray-600">Your verification has been submitted successfully.</p>
          </div>
        </div>
      );
    }

    if (isCreatingApplicant) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Setting up verification...</p>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 'device-choice':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Choose Verification Method</h3>
              <p className="text-gray-600 mb-6">How would you like to complete your identity verification?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleChooseWeb}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold mb-1">Continue on Web</h4>
                  <p className="text-sm text-gray-600">Complete verification directly in your browser</p>
                </div>
              </button>
              <button
                onClick={handleChoosePhone}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold mb-1">Verify on Phone</h4>
                  <p className="text-sm text-gray-600">Scan QR code to verify on your mobile device</p>
                </div>
              </button>
            </div>
          </div>
        );

      case 'phone-verification':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
              <p className="text-gray-600 mb-6">Scan this code with your phone's camera to continue verification</p>
            </div>
            <div className="flex justify-center">
              <div className="p-4 bg-white border rounded-lg">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="QR Code for verification" className="w-48 h-48" />
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Or open this link on your phone:</p>
              <a href={hostedUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                {hostedUrl}
              </a>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setCurrentStep('device-choice')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 underline"
              >
                Choose different method
              </button>
            </div>
          </div>
        );

      case 'document-upload':
        return (
          <DocumentUploadForm
            applicantId={applicantId}
            onComplete={handleDocumentComplete}
            onBack={onClose}
          />
        );

      case 'liveness-check':
        return (
          <LivenessCheckForm
            applicantId={applicantId}
            onComplete={handleLivenessComplete}
            onBack={handleBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Identity Verification</DialogTitle>
          <DialogDescription>
            Complete your identity verification to access all platform features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {currentStep !== 'device-choice' && currentStep !== 'phone-verification' && (
            <StepIndicator currentStep={getStepNumber()} />
          )}

          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}