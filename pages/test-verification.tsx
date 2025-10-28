/**
 * Phone Verification Test Page
 * 
 * Test the complete phone verification flow
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Phone, Shield, CheckCircle } from 'lucide-react'

export default function TestVerificationPage() {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('+256745315809')
  const [verificationCode, setVerificationCode] = useState('')
  const [result, setResult] = useState<any>(null)

  const sendCode = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/verify/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          countryCode: '+256'
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setStep('code')
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Network error',
        details: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/verify/check-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          code: verificationCode,
          countryCode: '+256'
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Network error',
        details: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setStep('phone')
    setVerificationCode('')
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Phone Verification Test</h1>
          <p className="text-gray-600">Test Twilio Verify integration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 'phone' ? (
                <>
                  <Phone className="w-5 h-5" />
                  Step 1: Send Code
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Step 2: Verify Code
                </>
              )}
            </CardTitle>
            <CardDescription>
              {step === 'phone' 
                ? 'Enter your phone number to receive a verification code'
                : 'Enter the 6-digit code sent to your phone'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {step === 'phone' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+256745315809"
                  />
                </div>
                
                <Button 
                  onClick={sendCode} 
                  disabled={loading || !phoneNumber}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Code sent to {phoneNumber}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={verifyCode} 
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify Code
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={resetFlow} 
                    variant="outline"
                    disabled={loading}
                  >
                    Back
                  </Button>
                </div>
              </>
            )}

            {/* Results */}
            {result && (
              <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.success ? '✅ Success!' : '❌ Error'}
                    </p>
                    
                    <p className="text-sm">
                      {result.message || result.error}
                    </p>
                    
                    {result.data && (
                      <div className="text-xs bg-gray-100 p-2 rounded">
                        <pre>{JSON.stringify(result.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>• This uses Twilio Verify service (no phone number required)</p>
            <p>• SMS will be sent to the phone number you enter</p>
            <p>• Enter the 6-digit code you receive</p>
            <p>• Test with +256745315809 or any valid phone number</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}