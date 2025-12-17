'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';

interface DocumentUploadFormProps {
  applicantId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface UploadState {
  front: { file: File | null; uploaded: boolean; url: string | null; error?: string };
  back: { file: File | null; uploaded: boolean; url: string | null; error?: string };
  currentSide: 'front' | 'back';
}

const documentTypes = {
  'ID_CARD': { label: 'ID Card', front: true, back: true },
  'DRIVERS': { label: "Driver's License", front: true, back: true },
  'PASSPORT': { label: 'Passport', front: true, back: false },
  'RESIDENCE_PERMIT': { label: 'Residence Permit', front: true, back: true }
};

export function DocumentUploadForm({ applicantId, onComplete, onBack }: DocumentUploadFormProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [uploads, setUploads] = useState<UploadState>({
    front: { file: null, uploaded: false, url: null },
    back: { file: null, uploaded: false, url: null },
    currentSide: 'front'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');

  const selectedDocType = selectedType ? documentTypes[selectedType as keyof typeof documentTypes] : null;
  const needsBack = selectedDocType?.back || false;

  const handleFileSelect = useCallback((side: 'front' | 'back') => (file: File) => {
    setUploads(prev => ({
      ...prev,
      [side]: { file, uploaded: false, url: null, error: undefined }
    }));
    setError('');
  }, []);

  const uploadDocument = async (file: File, side: 'front' | 'back'): Promise<string> => {
    console.log('📤 Frontend sending upload request:', {
      applicantId,
      selectedType,
      side,
      fileName: file.name,
      fileSize: file.size
    });

    const formData = new FormData();

    // Create metadata object as expected by backend
    const metadata = {
      idDocType: selectedType,
      country: 'US', // Default to US, can be made configurable
      idDocSubType: side === 'front' ? 'FRONT_SIDE' : 'BACK_SIDE'
    };

    console.log('📦 Frontend metadata:', metadata);
    console.log('📦 Frontend metadata JSON:', JSON.stringify(metadata));

    formData.append('metadata', JSON.stringify(metadata));
    formData.append('content', file);
    formData.append('applicantId', applicantId);

    // Debug: Log FormData contents
    console.log('📋 FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    const response = await fetch('/api/kyc/upload-document', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return result.data.url || 'uploaded';
  };

  const handleUpload = async (side: 'front' | 'back') => {
    const uploadState = uploads[side];
    if (!uploadState.file) return;

    setIsUploading(true);
    setError('');

    try {
      const url = await uploadDocument(uploadState.file, side);
      setUploads(prev => ({
        ...prev,
        [side]: { ...prev[side], uploaded: true, url, error: undefined }
      }));
    } catch (err: any) {
      setUploads(prev => ({
        ...prev,
        [side]: { ...prev[side], error: err.message }
      }));
      setError(`Failed to upload ${side} document: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const canContinue = () => {
    if (!selectedType) return false;
    // Must have front uploaded, and back uploaded if required
    const hasFront = uploads.front.uploaded;
    const hasBack = !needsBack || uploads.back.uploaded;
    return hasFront && hasBack;
  };

  const getCurrentSide = (): 'front' | 'back' => {
    return uploads.front.uploaded ? 'back' : 'front';
  };

  const isCurrentSideUploaded = (): boolean => {
    const currentSide = getCurrentSide();
    return uploads[currentSide].uploaded;
  };

  const FileUploadArea = ({ side, title }: { side: 'front' | 'back'; title: string }) => {
    const uploadState = uploads[side];
    const currentSide = getCurrentSide();
    const isActive = side === currentSide && !uploadState.uploaded;

    const onDrop = useCallback((acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        handleFileSelect(side)(file);
      }
    }, [side]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif']
      },
      maxSize: 10 * 1024 * 1024, // 10MB
      multiple: false,
      disabled: uploadState.uploaded || side !== currentSide
    });

    return (
        <Card className={`p-4 ${!isActive && !uploadState.uploaded ? 'opacity-50' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {title}
              {uploadState.uploaded && <CheckCircle className="w-4 h-4 text-green-500" />}
              {uploadState.error && <XCircle className="w-4 h-4 text-red-500" />}
              {!isActive && !uploadState.uploaded && <span className="text-xs text-gray-400">(Pending)</span>}
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-3">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              !isActive
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : isDragActive
                ? 'border-primary bg-primary/5 cursor-pointer'
                : uploadState.uploaded
                ? 'border-green-300 bg-green-50 cursor-default'
                : 'border-gray-300 hover:border-gray-400 cursor-pointer'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {uploadState.file ? (
                <>
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{uploadState.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {isDragActive ? 'Drop the file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {uploadState.file && !uploadState.uploaded && !uploadState.error && isActive && (
            <Button
              onClick={() => handleUpload(side)}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : `Upload ${title}`}
            </Button>
          )}

          {uploadState.uploaded && (
            <Badge variant="secondary" className="w-full justify-center text-green-600 bg-green-50">
              <CheckCircle className="w-3 h-3 mr-1" />
              Document Uploaded Successfully
            </Badge>
          )}

          {uploadState.error && (
            <Alert variant="destructive">
              <AlertDescription>{uploadState.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Document Verification</h2>
        <p className="text-gray-600">Upload your identification documents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(documentTypes).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedType && (
        <div className="space-y-4">
          <FileUploadArea side="front" title="Front Side" />

          {needsBack && uploads.front.uploaded && (
            <FileUploadArea side="back" title="Back Side" />
          )}

          {!needsBack && uploads.front.uploaded && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">Document uploaded successfully!</p>
              <p className="text-green-600 text-sm">Click "Continue to Liveness Check" to proceed.</p>
            </div>
          )}

          {needsBack && uploads.front.uploaded && !uploads.back.uploaded && (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-medium">Front side uploaded! Now upload the back side.</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onComplete}
          disabled={!canContinue() || isUploading}
        >
          {canContinue() ? 'Continue to Liveness Check' : isCurrentSideUploaded() ? 'Upload Next Side' : 'Upload Document First'}
        </Button>
      </div>
    </div>
  );
}