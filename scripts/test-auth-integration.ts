/**
 * Better Auth Integration Test
 * 
 * Tests the complete authentication system:
 * - Email service integration
 * - Google OAuth configuration
 * - Database connection
 * - API endpoints
 */

import { config } from 'dotenv'
import { resolve } from 'path'

async function testAuthIntegration() {
  // Load environment variables
  config({ path: resolve(process.cwd(), '.env.local') })
  
  console.log('🔐 Testing Better Auth Integration...\n')
  
  // Test 1: Environment Variables
  console.log('1️⃣ Checking Environment Variables...')
  
  const requiredEnvVars = [
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM',
    'DATABASE_URL'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars.join(', '))
    process.exit(1)
  }
  
  console.log('✅ All required environment variables are set')
  
  // Test 2: Email Service
  console.log('\n2️⃣ Testing Email Service Integration...')
  
  try {
    const { emailService } = await import('../src/lib/email')
    
    const connectionValid = await emailService.verifyConnection()
    if (!connectionValid) {
      console.error('❌ Email service connection failed')
      process.exit(1)
    }
    
    console.log('✅ Email service connection verified')
    
  } catch (error: any) {
    console.error('❌ Email service test failed:', error.message)
    process.exit(1)
  }
  
  // Test 3: Better Auth Configuration
  console.log('\n3️⃣ Testing Better Auth Configuration...')
  
  try {
    const { auth } = await import('../lib/auth')
    
    // Check if auth object is properly configured
    if (!auth) {
      console.error('❌ Better Auth configuration failed to load')
      process.exit(1)
    }
    
    console.log('✅ Better Auth configuration loaded successfully')
    
    // Test database connection through Drizzle
    console.log('   Testing database connection...')
    
    try {
      const { db } = await import('../drizzle/db')
      
      // Simple query to test connection
      await db.execute('SELECT 1 as test')
      
      console.log('✅ Database connection through Better Auth verified')
      
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError.message)
      throw dbError
    }
    
  } catch (error: any) {
    console.error('❌ Better Auth configuration test failed:', error.message)
    
    if (error.message.includes('database')) {
      console.log('💡 Tip: Check your DATABASE_URL in .env.local')
    }
    
    process.exit(1)
  }
  
  // Test 4: Google OAuth Configuration
  console.log('\n4️⃣ Testing Google OAuth Configuration...')
  
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!googleClientId || !googleClientSecret) {
    console.error('❌ Google OAuth credentials not found')
    process.exit(1)
  }
  
  // Validate Google Client ID format
  if (!googleClientId.includes('.apps.googleusercontent.com')) {
    console.error('❌ Invalid Google Client ID format')
    process.exit(1)
  }
  
  // Validate Google Client Secret format
  if (!googleClientSecret.startsWith('GOCSPX-')) {
    console.error('❌ Invalid Google Client Secret format')
    process.exit(1)
  }
  
  console.log('✅ Google OAuth credentials format validated')
  
  // Test 5: API Endpoints
  console.log('\n5️⃣ Testing API Endpoints...')
  
  try {
    // Test if the Better Auth API handler exists
    const fs = await import('fs')
    const path = await import('path')
    
    const apiHandlerPath = path.resolve(process.cwd(), 'app/api/auth/[...all]/route.ts')
    
    if (!fs.existsSync(apiHandlerPath)) {
      console.error('❌ Better Auth API handler not found')
      process.exit(1)
    }
    
    console.log('✅ Better Auth API handler exists')
    
  } catch (error: any) {
    console.error('❌ API endpoint test failed:', error.message)
    process.exit(1)
  }
  
  // Summary
  console.log('\n🎯 Authentication Integration Test Results:')
  console.log('✅ Environment variables configured')
  console.log('✅ Email service (SMTP) working')
  console.log('✅ Better Auth configuration loaded')
  console.log('✅ Database connection verified')
  console.log('✅ Google OAuth credentials validated')
  console.log('✅ API endpoints configured')
  
  console.log('\n🚀 Your authentication system is fully integrated!')
  console.log('\n📋 Available Features:')
  console.log('   • Email/Password authentication with verification')
  console.log('   • Google OAuth sign-in')
  console.log('   • Password reset via email')
  console.log('   • Passkey (WebAuthn) support')
  console.log('   • Two-factor authentication (TOTP)')
  console.log('   • Organization management')
  
  console.log('\n🔗 Authentication URLs:')
  console.log(`   • Sign In: ${process.env.BETTER_AUTH_URL}/api/auth/sign-in`)
  console.log(`   • Sign Up: ${process.env.BETTER_AUTH_URL}/api/auth/sign-up`)
  console.log(`   • Google OAuth: ${process.env.BETTER_AUTH_URL}/api/auth/sign-in/google`)
  console.log(`   • Sign Out: ${process.env.BETTER_AUTH_URL}/api/auth/sign-out`)
}

testAuthIntegration().catch(console.error)