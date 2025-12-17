'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Shield, TrendingUp } from 'lucide-react';

interface VerificationResult {
  reviewStatus: 'completed' | 'pending' | 'review';
  reviewResult?: {
    reviewAnswer: 'GREEN' | 'RED';
    rejectLabels?: string[];
    reviewRejectType?: string;
  };
  riskScore?: number;
  [key: string]: any;
}

interface ResultDisplayProps {
  result: VerificationResult;
  onContinue: () => void;
}

export function ResultDisplay({ result, onContinue }: ResultDisplayProps) {
  const isApproved = result.reviewResult?.reviewAnswer === 'GREEN';
  const isRejected = result.reviewResult?.reviewAnswer === 'RED';
  const isPending = result.reviewStatus === 'pending' || result.reviewStatus === 'review';

  const getRiskLevel = (score?: number) => {
    if (!score) return { level: 'Unknown', color: 'gray' };
    if (score <= 30) return { level: 'Low', color: 'green' };
    if (score <= 70) return { level: 'Medium', color: 'yellow' };
    return { level: 'High', color: 'red' };
  };

  const riskInfo = getRiskLevel(result.riskScore);

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Verification In Progress</h2>
          <p className="text-gray-600">Your verification is still being processed</p>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold mb-2">Under Manual Review</h3>
            <p className="text-gray-600 mb-4">
              Your documents are being reviewed by our compliance team. This usually takes 1-24 hours.
            </p>
            <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
              Manual Review Required
            </Badge>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={onContinue} size="lg">
            Return to Dashboard
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            You'll receive a notification when the review is complete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {isApproved ? 'Verification Successful!' : 'Verification Failed'}
        </h2>
        <p className="text-gray-600">
          {isApproved
            ? 'Your identity has been verified successfully'
            : 'Your verification could not be completed'
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isApproved ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            Verification Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Result */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold ${
              isApproved
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isApproved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  VERIFIED
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  REJECTED
                </>
              )}
            </div>
          </div>

          {/* Risk Score */}
          {result.riskScore !== undefined && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Risk Assessment
                </span>
                <Badge variant={
                  riskInfo.color === 'green' ? 'secondary' :
                  riskInfo.color === 'yellow' ? 'secondary' :
                  'destructive'
                } className={
                  riskInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                  riskInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                  ''
                }>
                  {riskInfo.level} Risk
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    riskInfo.color === 'green' ? 'bg-green-500' :
                    riskInfo.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${result.riskScore}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Risk Score: {result.riskScore}/100
              </p>
            </div>
          )}

          {/* Rejection Reasons */}
          {isRejected && result.reviewResult?.rejectLabels && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Rejection Reasons:</strong>
                <ul className="mt-2 space-y-1">
                  {result.reviewResult.rejectLabels.map((label, index) => (
                    <li key={index} className="text-sm">• {label.replace(/_/g, ' ').toLowerCase()}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Next Steps */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">What happens next?</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {isApproved ? (
                <>
                  <p>✅ Your account is now fully verified</p>
                  <p>✅ You can now access all platform features</p>
                  <p>✅ Your verification status will be visible on your profile</p>
                </>
              ) : (
                <>
                  <p>❌ Your verification was not approved</p>
                  <p>❌ Please check the rejection reasons above</p>
                  <p>❌ You can retry verification after addressing the issues</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button onClick={onContinue} size="lg">
          {isApproved ? 'Continue to Dashboard' : 'Return to Dashboard'}
        </Button>
        {isRejected && (
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Verification
          </Button>
        )}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Need help? Contact our support team at{' '}
          <a href="mailto:support@example.com" className="text-primary hover:underline">
            support@example.com
          </a>
        </p>
      </div>
    </div>
  );
}