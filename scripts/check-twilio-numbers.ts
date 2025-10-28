#!/usr/bin/env tsx

/**
 * Check available Twilio phone numbers for Uganda SMS
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import twilio from 'twilio'

async function checkTwilioNumbers() {
  // Load environment variables
  config({ path: resolve(process.cwd(), '.env.local') })

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )

  console.log('🔍 Checking Twilio phone number capabilities...\n')

  try {
    // Check current phone number capabilities
    console.log('📱 Current Phone Number:', process.env.TWILIO_PHONE_NUMBER)
    
    const phoneNumber = await client.incomingPhoneNumbers.list({
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    })

    if (phoneNumber.length > 0) {
      const number = phoneNumber[0]
      console.log('✅ Phone Number Found:')
      console.log('   SID:', number.sid)
      console.log('   Capabilities:', {
        sms: number.capabilities.sms,
        voice: number.capabilities.voice,
        mms: number.capabilities.mms
      })
    } else {
      console.log('❌ Phone number not found in your account')
    }

    console.log('\n🌍 Checking available numbers for international SMS...')
    
    // Check available phone numbers that support SMS
    const availableNumbers = await client.availablePhoneNumbers('US')
      .local
      .list({
        smsEnabled: true,
        limit: 5
      })

    console.log(`\n📋 Available US numbers with SMS (${availableNumbers.length} found):`)
    availableNumbers.forEach((number, index) => {
      console.log(`${index + 1}. ${number.phoneNumber} - ${number.friendlyName}`)
    })

    // Check if there are any Ugandan numbers available
    try {
      const ugandanNumbers = await client.availablePhoneNumbers('UG')
        .local
        .list({
          smsEnabled: true,
          limit: 5
        })

      console.log(`\n🇺🇬 Available Ugandan numbers (${ugandanNumbers.length} found):`)
      ugandanNumbers.forEach((number, index) => {
        console.log(`${index + 1}. ${number.phoneNumber} - ${number.friendlyName}`)
      })
    } catch (error) {
      console.log('\n🇺🇬 No Ugandan phone numbers available in your region')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

checkTwilioNumbers()