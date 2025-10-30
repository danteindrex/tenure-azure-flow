#!/usr/bin/env tsx

/**
 * Test Twilio Verify Service
 * This doesn't require a specific phone number - Twilio handles it automatically
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import twilio from 'twilio'

async function testVerifyService() {
  // Load environment variables
  config({ path: resolve(process.cwd(), '.env.local') })

  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!

  console.log('🔍 Testing Twilio Verify Service...\n')
  console.log('Account SID:', accountSid)
  console.log('Verify Service SID:', verifyServiceSid)
  console.log('')

  const client = twilio(accountSid, authToken)

  try {
    // Test 1: Send verification code
    console.log('📱 Test 1: Sending verification code to +256745315809...')
    
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({
        to: '+256745315809',
        channel: 'sms'
      })

    console.log('✅ Verification code sent successfully!')
    console.log('   SID:', verification.sid)
    console.log('   Status:', verification.status)
    console.log('   To:', verification.to)
    console.log('   Channel:', verification.channel)
    console.log('')

    // Test 2: Check verification status
    console.log('📋 Test 2: Checking verification status...')
    
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verifications(verification.sid)
      .fetch()

    console.log('✅ Verification status retrieved!')
    console.log('   Status:', verificationCheck.status)
    console.log('   Valid:', verificationCheck.valid)
    console.log('')

    console.log('🎉 SUCCESS! Twilio Verify is working correctly!')
    console.log('📱 Check your phone (+256745315809) for the verification code.')
    console.log('')
    console.log('💡 To verify the code, you would call:')
    console.log('   client.verify.v2.services(serviceSid).verificationChecks.create({')
    console.log('     to: "+256745315809",')
    console.log('     code: "123456" // The code from SMS')
    console.log('   })')

  } catch (error: any) {
    console.error('❌ Error testing Verify service:', error.message)
    console.error('Status:', error.status)
    console.error('Code:', error.code)
    console.error('More info:', error.moreInfo)
  }
}

testVerifyService()