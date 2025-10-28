/**
 * Test Better Auth Signup
 * 
 * This script tests if Better Auth can create users and send emails
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testBetterAuthSignup() {
  console.log('🧪 Testing Better Auth signup process...')
  
  try {
    // Test signup via API call (simulating what the frontend does)
    const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'trevorsdanny@gmail.com', // Your verified email
        password: 'TestPassword123!',
        name: 'Test User'
      }),
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Better Auth signup successful!')
      console.log('Response:', result)
      console.log('📧 Check your email for verification!')
    } else {
      console.error('❌ Better Auth signup failed:')
      console.error('Status:', response.status)
      console.error('Error:', result)
      
      // Check for common issues
      if (result.message?.includes('email')) {
        console.log('\n💡 Schema issue: Better Auth can\'t find email field')
      }
      if (result.message?.includes('user')) {
        console.log('💡 User table issue: Better Auth schema mismatch')
      }
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your Next.js server is running: npm run dev:next')
    }
  }
}

testBetterAuthSignup()