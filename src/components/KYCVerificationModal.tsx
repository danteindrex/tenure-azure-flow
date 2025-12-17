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


interface KYCVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type VerificationStep = 'document-upload' | 'liveness-check';

export function KYCVerificationModal({
  isOpen,
  onClose,
  onSuccess,
}: KYCVerificationModalProps) {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('document-upload');
  const [applicantId, setApplicantId] = useState<string>('');

  const [isCreatingApplicant, setIsCreatingApplicant] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const user = session?.user;

  // Create applicant when modal opens
  useEffect(() => {
    if (isOpen && !applicantId && !isCreatingApplicant && user?.id) {
      createApplicant();
    }
  }, [isOpen, applicantId, isCreatingApplicant, user?.id]);

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
      console.log('📡 Making API call to /api/kyc/create-applicant');
      const response = await fetch('/api/kyc/create-applicant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
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

  const handleDocumentComplete = () => {
    setCurrentStep('liveness-check');
  };

  const handleLivenessComplete = () => {
    // Skip verification status display - just close the modal
    // Results are stored in database via webhook
    onClose();
  };



  const handleBack = () => {
    if (currentStep === 'liveness-check') {
      setCurrentStep('document-upload');
    }
  };

  const getStepNumber = (): number => {
    switch (currentStep) {
      case 'document-upload': return 1;
      case 'liveness-check': return 2;
      default: return 1;
    }
  };

  const renderCurrentStep = () => {
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
          <StepIndicator currentStep={getStepNumber()} />

          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}