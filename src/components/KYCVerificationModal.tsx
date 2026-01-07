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

  // Reset state when modal opens and auto-generate QR code
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('device-choice');
      setApplicantId('');
      setHostedUrl('');
      setQrCodeDataUrl('');
      setShowSuccessMessage(false);
      
      // Auto-generate QR code when modal opens
      generateQRCode();
    }
  }, [isOpen]);

  // Function to generate QR code automatically
  const generateQRCode = async () => {
    if (!user?.email) return;
    
    setIsCreatingApplicant(true);
    try {
      const response = await fetch('/api/kyc/generate-hosted-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate hosted link');
      }

      const data = await response.json();
      console.log('🔗 Hosted link response:', data);

      if (!data.success || !data.data?.hostedUrl) {
        throw new Error('No URL returned from hosted link API');
      }

      setHostedUrl(data.data.hostedUrl);

      // Generate QR code with error handling
      try {
        const qrDataUrl = await QRCode.toDataURL(data.data.hostedUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (qrError: any) {
        console.error('QR generation failed:', qrError);
        // Don't show error toast for auto-generation, just log it
      }
    } catch (error: any) {
      console.error('Error auto-generating hosted link:', error);
      // Don't show error toast for auto-generation, just log it
    } finally {
      setIsCreatingApplicant(false);
    }
  };

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
          <div className="space-y-6 p-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Let's get you verified</h2>
            </div>

            {/* Instructions */}
            <div className="space-y-4 mb-8">
              {/* Document preparation */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Prepare a valid document</p>
                  <p className="text-sm text-gray-600">Make sure it's not expired or physically damaged</p>
                </div>
              </div>

              {/* Smartphone requirement */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Use a smartphone</p>
                  <p className="text-sm text-gray-600">You need a smartphone in order to continue</p>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="text-center space-y-4">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Scan QR code</h3>
                <p className="text-sm text-gray-600 mb-4">Scan the QR code to continue on another device</p>
              </div>

              {/* QR Code - auto-generated on modal open */}
              <div className="flex justify-center mb-6">
                <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center p-2">
                  {isCreatingApplicant ? (
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Loading...</p>
                    </div>
                  ) : qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR Code for verification" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-4h.01M12 8h.01" />
                      </svg>
                      <p className="text-xs text-gray-500">QR code unavailable</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy notice */}
              <div className="text-xs text-gray-500 mb-6">
                Read more about your personal data processing in Veriff's Privacy Notice.
              </div>

              {/* Continue with web option */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleChooseWeb}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 font-medium py-2 px-4 transition-colors"
                >
                  Don't have a smartphone? Continue with your current device
                </button>
              </div>
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
                  <img src={qrCodeDataUrl} alt="QR Code for verification" className="w-64 h-64" />
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