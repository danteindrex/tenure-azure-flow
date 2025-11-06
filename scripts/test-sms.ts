#!/usr/bin/env tsx

/**
 * Direct SMS Test Script
 * 
 * Tests Twilio SMS functionality without needing the web server
 */

import { config } from 'dotenv'
import { resolve } from 'path'

async function runSMSTest() {
  // Load environment variables from .env.local
  config({ path: resolve(process.cwd(), '.env.local') })

  // Debug: Check if environment variables are loaded
  console.log('🔍 Environment Variables Check:')
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing')
  console.log('TWILIO_TEST_ACCOUNT_SID:', process.env.TWILIO_TEST_ACCOUNT_SID ? '✅ Set' : '❌ Missing')
  console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing')
  console.log('TWILIO_TEST_AUTH_TOKEN:', process.env.TWILIO_TEST_AUTH_TOKEN ? '✅ Set' : '❌ Missing')
  console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Missing')
  console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined')
  console.log('')

  // Import after environment is loaded
  const { testSMS, sendSMS, sendVerificationCode } = await import('../src/lib/twilio')
  console.log('🚀 Starting Twilio SMS Test...\n')

  try {
    // Test 1: Quick test SMS
    console.log('📱 Test 1: Sending test SMS to +256745315809...')
    const testResult = await testSMS()
    
    if (testResult.success) {
      console.log('✅ Test SMS sent successfully!')
      console.log(`   Message ID: ${testResult.messageId}`)
      console.log(`   Status: ${testResult.status}`)
    } else {
      console.log('❌ Test SMS failed!')
      console.log(`   Error: ${testResult.error}`)
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // Test 2: Custom SMS
    console.log('📱 Test 2: Sending custom SMS...')
    const customResult = await sendSMS(
      '+256745315809',
      'Hello! This is a custom test message from your Home Solutions app. SMS integration is working! 🎉'
    )
    
    if (customResult.success) {
      console.log('✅ Custom SMS sent successfully!')
      console.log(`   Message ID: ${customResult.messageId}`)
      console.log(`   Status: ${customResult.status}`)
    } else {
      console.log('❌ Custom SMS failed!')
      console.log(`   Error: ${customResult.error}`)
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // Test 3: Verification code
    console.log('📱 Test 3: Sending verification code...')
    const verifyResult = await sendVerificationCode('+256745315809')
    
    if (verifyResult.success) {
      console.log('✅ Verification code sent successfully!')
      console.log(`   Status: ${verifyResult.status}`)
    } else {
      console.log('❌ Verification code failed!')
      console.log(`   Error: ${verifyResult.error}`)
    }

    console.log('\n' + '='.repeat(50) + '\n')
    console.log('🎯 SMS Test Complete!')
    console.log('\nPlease check your phone (+256745315809) for the test messages.')
    console.log('If you received the messages, the Twilio integration is working correctly! ✅')

  } catch (error: any) {
    console.error('💥 SMS Test Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
runSMSTest()