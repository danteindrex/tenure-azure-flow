'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, CheckCircle, AlertTriangle } from 'lucide-react';

interface LivenessCheckFormProps {
  applicantId: string;
  onComplete: () => void;
  onBack: () => void;
}

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: 'user'
};

export function LivenessCheckForm({ applicantId, onComplete, onBack }: LivenessCheckFormProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUserMedia = useCallback(() => {
    setHasPermission(true);
    setError('');
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    setHasPermission(false);
    setError('Camera access denied. Please allow camera permissions and try again.');
    console.error('Camera error:', error);
  }, []);

  const capture = useCallback(async () => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    setError('');

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }

      // Convert base64 to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();

      // Create file from blob
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });

      // Upload selfie for liveness check
      const formData = new FormData();
      formData.append('applicantId', applicantId);
      formData.append('documentType', 'SELFIE');
      formData.append('country', 'US');
      formData.append('file', file);

      const uploadResponse = await fetch('/api/kyc/upload-document', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload selfie');
      }

      // Start verification process (triggers liveness analysis)
      const verifyResponse = await fetch('/api/kyc/start-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicantId }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResult.success) {
        throw new Error(verifyResult.error || 'Failed to start verification');
      }

      setIsProcessing(true);

      // Wait a moment for processing to begin
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: any) {
      setError(`Failed to complete liveness check: ${err.message}`);
    } finally {
      setIsCapturing(false);
    }
  }, [applicantId, onComplete]);

  if (hasPermission === false) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Liveness Check</h2>
          <p className="text-gray-600">Verify your identity with a live photo</p>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
            <p className="text-gray-600 mb-4">
              We need access to your camera to perform the liveness check.
              Please allow camera permissions in your browser settings.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry Camera Access
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Liveness Check</h2>
        <p className="text-gray-600">Verify your identity with a live photo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Camera Preview
            {hasPermission && <Badge variant="secondary">Ready</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full rounded-lg border"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
            />

            {hasPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Requesting camera access...</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Instructions</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Position your face clearly in the camera frame</li>
                  <li>• Ensure good lighting and remove sunglasses</li>
                  <li>• Look directly at the camera</li>
                  <li>• The system will automatically analyze your photo</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isProcessing && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Processing your liveness check...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          Back
        </Button>
        <Button
          onClick={capture}
          disabled={!hasPermission || isCapturing || isProcessing}
          className="min-w-[140px]"
        >
          {isCapturing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Capturing...
            </>
          ) : isProcessing ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}