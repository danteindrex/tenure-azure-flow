/**
 * SMS Test Page
 * 
 * Simple page to test Twilio SMS functionality
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, MessageSquare, Phone, Send } from 'lucide-react'

export default function TestSMSPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [phoneNumber, setPhoneNumber] = useState('+256745315809')
  const [message, setMessage] = useState('Hello from Tenure! This is a test message.')

  const testSMS = async (action: string, customPhone?: string, customMessage?: string) => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          phoneNumber: customPhone || phoneNumber,
          message: customMessage || message
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Network error',
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Test Page</h1>
          <p className="text-gray-600">Test Twilio SMS integration</p>
        </div>

        <div className="space-y-6">
          {/* Quick Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Quick Test
              </CardTitle>
              <CardDescription>
                Send a test SMS to +256745315809 (the only number that works with test credentials)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => testSMS('test')} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Test SMS...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test SMS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Custom SMS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Custom SMS
              </CardTitle>
              <CardDescription>
                Send a custom SMS (only works with +256745315809 in test mode)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message"
                />
              </div>

              <Button 
                onClick={() => testSMS('send', phoneNumber, message)} 
                disabled={loading || !phoneNumber || !message}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending SMS...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Custom SMS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Verification Code Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Verification Code
              </CardTitle>
              <CardDescription>
                Send a verification code SMS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => testSMS('verify', phoneNumber)} 
                disabled={loading || !phoneNumber}
                className="w-full"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Verification Code...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                        {result.message}
                      </p>
                      
                      {result.data && (
                        <div className="text-sm text-gray-600">
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {result.error && (
                        <p className="text-red-600 text-sm">
                          Error: {result.error}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Test Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>• This is using Twilio test credentials</p>
              <p>• SMS will only be delivered to +256745315809</p>
              <p>• Check your phone for incoming messages</p>
              <p>• If successful, we can add the credentials to production</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}