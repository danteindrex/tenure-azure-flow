/**
 * Twilio SMS Service
 * 
 * Handles SMS sending and phone verification using Twilio
 * Supports both production and test credentials
 */

import twilio from 'twilio'

// Configuration
const config = {
  // Always use production credentials for Verify service (test credentials don't support it)
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  
  // Test credentials for regular SMS (if needed)
  testAccountSid: process.env.TWILIO_TEST_ACCOUNT_SID,
  testAuthToken: process.env.TWILIO_TEST_AUTH_TOKEN,
  testPhoneNumber: process.env.TWILIO_TEST_PHONE_NUMBER
}

// Validate configuration
if (!config.accountSid || !config.authToken || !config.phoneNumber) {
  throw new Error('Missing Twilio configuration. Please check your environment variables.')
}

// Initialize Twilio client
const client = twilio(config.accountSid, config.authToken)

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  status?: string
}

export interface VerificationResult {
  success: boolean
  status?: string
  error?: string
  verificationSid?: string
  valid?: boolean
}

/**
 * Send SMS message
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  try {
    console.log(`Sending SMS to ${to} from ${config.phoneNumber}`)
    console.log(`Message: ${message}`)
    
    const result = await client.messages.create({
      body: message,
      from: config.phoneNumber,
      to: to
    })

    console.log(`SMS sent successfully. SID: ${result.sid}, Status: ${result.status}`)

    return {
      success: true,
      messageId: result.sid,
      status: result.status
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error)
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    }
  }
}

/**
 * Send verification code using Twilio Verify
 */
export async function sendVerificationCode(phoneNumber: string): Promise<VerificationResult> {
  try {
    if (!config.verifyServiceSid) {
      return {
        success: false,
        error: 'Verify service not configured. Please set TWILIO_VERIFY_SERVICE_SID.'
      }
    }

    console.log(`Sending verification code to ${phoneNumber} using Verify service`)
    
    const verification = await client.verify.v2
      .services(config.verifyServiceSid)
      .verifications
      .create({
        to: phoneNumber,
        channel: 'sms'
      })

    console.log(`Verification sent successfully!`)
    console.log(`   SID: ${verification.sid}`)
    console.log(`   Status: ${verification.status}`)
    console.log(`   To: ${verification.to}`)

    return {
      success: true,
      status: verification.status,
      verificationSid: verification.sid
    }
  } catch (error: any) {
    console.error('Error sending verification code:', error)
    return {
      success: false,
      error: error.message || 'Failed to send verification code'
    }
  }
}

/**
 * Verify phone number with code
 */
export async function verifyPhoneNumber(phoneNumber: string, code: string): Promise<VerificationResult> {
  try {
    if (!config.verifyServiceSid) {
      return {
        success: false,
        error: 'Verify service not configured. Please set TWILIO_VERIFY_SERVICE_SID.'
      }
    }

    console.log(`Verifying code ${code} for ${phoneNumber}`)
    
    const verificationCheck = await client.verify.v2
      .services(config.verifyServiceSid)
      .verificationChecks
      .create({
        to: phoneNumber,
        code: code
      })

    console.log(`Verification check completed!`)
    console.log(`   Status: ${verificationCheck.status}`)
    console.log(`   Valid: ${verificationCheck.valid}`)

    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status,
      valid: verificationCheck.valid
    }
  } catch (error: any) {
    console.error('Error verifying phone number:', error)
    return {
      success: false,
      error: error.message || 'Failed to verify phone number'
    }
  }
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phoneNumber: string, countryCode: string = '+256'): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '')
  
  // If it starts with country code digits, use as is
  if (digits.startsWith('256')) {
    return `+${digits}`
  }
  
  // If it starts with 0, replace with country code
  if (digits.startsWith('0')) {
    return `${countryCode}${digits.substring(1)}`
  }
  
  // Otherwise, add country code
  return `${countryCode}${digits}`
}

/**
 * Test SMS functionality
 */
export async function testSMS(): Promise<SMSResult> {
  const testPhoneNumber = '+256745315809' // Your test number
  const testMessage = 'Hello from Tenure! This is a test SMS to verify Twilio integration is working correctly.'
  
  console.log('Testing SMS functionality...')
  
  // For test credentials, try using production credentials instead
  if (config.testAccountSid && config.accountSid === config.testAccountSid) {
    console.log('Using test credentials, switching to production for actual SMS...')
    
    // Use production credentials for the actual test
    const prodClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
    
    try {
      const result = await prodClient.messages.create({
        body: testMessage,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: testPhoneNumber
      })

      console.log(`SMS sent successfully with production credentials. SID: ${result.sid}, Status: ${result.status}`)

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      }
    } catch (error: any) {
      console.error('Error sending SMS with production credentials:', error)
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      }
    }
  }
  
  return await sendSMS(testPhoneNumber, testMessage)
}

export default {
  sendSMS,
  sendVerificationCode,
  verifyPhoneNumber,
  formatPhoneNumber,
  testSMS
}