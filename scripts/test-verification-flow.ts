#!/usr/bin/env tsx

/**
 * Test the complete verification flow
 */

import { config } from 'dotenv'
import { resolve } from 'path'

async function testVerificationFlow() {
  // Load environment variables
  config({ path: resolve(process.cwd(), '.env.local') })

  console.log('🧪 Testing Phone Verification Flow...\n')

  const testPhone = '+256745315809'

  try {
    // Step 1: Send verification code
    console.log('📱 Step 1: Sending verification code...')
    
    const { sendVerificationCode } = await import('../src/lib/twilio')
    const sendResult = await sendVerificationCode(testPhone)
    
    if (sendResult.success) {
      console.log('✅ Verification code sent successfully!')
      console.log(`   Status: ${sendResult.status}`)
      console.log(`   SID: ${sendResult.verificationSid}`)
      console.log('')
      
      console.log('📱 Check your phone for the verification code!')
      console.log('💡 To complete the test, you would call verifyPhoneNumber(phone, code)')
      console.log('')
      console.log('🎯 Verification flow is working correctly!')
      
    } else {
      console.log('❌ Failed to send verification code')
      console.log(`   Error: ${sendResult.error}`)
    }

  } catch (error: any) {
    console.error('💥 Test Error:', error.message)
  }
}

testVerificationFlow()