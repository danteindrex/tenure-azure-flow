'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface VerificationStatusProps {
  applicantId: string;
  onComplete: (result: any) => void;
  onRetry: () => void;
}

export function VerificationStatus({ applicantId, onComplete, onRetry }: VerificationStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/kyc/status`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to check status');
        }

        const statusData = result.data;
        setStatus(statusData);

        // Check if verification is complete
        if (statusData.reviewStatus === 'completed') {
          // Get final results
          const finalResponse = await fetch(`/api/kyc/get-results?applicantId=${applicantId}`);
          if (finalResponse.ok) {
            const finalResult = await finalResponse.json();
            onComplete(finalResult.data);
          } else {
            onComplete(statusData);
          }
          return;
        }

        // Continue polling if still processing
        if (statusData.reviewStatus === 'pending' || statusData.reviewStatus === 'review') {
          interval = setTimeout(checkStatus, 3000); // Check every 3 seconds
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Start progress animation
    progressInterval = setInterval(() => {
      setProgress(prev => (prev + 2) % 100);
    }, 200);

    // Start status checking
    checkStatus();

    return () => {
      if (interval) clearTimeout(interval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [applicantId, onComplete]);

  const getStatusDisplay = () => {
    if (!status) return { text: 'Initializing...', color: 'text-gray-600' };

    switch (status.reviewStatus) {
      case 'pending':
        return { text: 'Documents submitted, waiting for processing...', color: 'text-blue-600' };
      case 'review':
        return { text: 'Under review by our team...', color: 'text-yellow-600' };
      case 'completed':
        return { text: 'Verification completed!', color: 'text-green-600' };
      default:
        return { text: 'Processing...', color: 'text-gray-600' };
    }
  };

  const statusDisplay = getStatusDisplay();

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Verification Status</h2>
          <p className="text-gray-600">Checking verification progress</p>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Status Check Failed</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Verification Status</h2>
        <p className="text-gray-600">Your documents are being processed</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Processing Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {status?.reviewStatus === 'completed' ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div>
              <p className={`font-medium ${statusDisplay.color}`}>
                {statusDisplay.text}
              </p>
              <p className="text-sm text-gray-500">
                This usually takes 1-3 minutes
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={status?.reviewStatus === 'completed' ? 100 : progress} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Processing documents...</span>
              <span>{status?.reviewStatus === 'completed' ? '100%' : `${Math.round(progress)}%`}</span>
            </div>
          </div>

          {/* Status Details */}
          {status && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <strong>What happens next:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Document authenticity verification</li>
                <li>• Facial recognition analysis</li>
                <li>• Risk assessment and scoring</li>
                <li>• Final approval decision</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Please keep this window open. You'll be redirected automatically when verification is complete.
        </p>
      </div>
    </div>
  );
}