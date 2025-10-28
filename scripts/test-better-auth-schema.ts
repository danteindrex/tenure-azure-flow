/**
 * Test Better Auth Schema
 * 
 * This script tests if Better Auth can properly read the user schema
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../drizzle/db'
import { user } from '../drizzle/schema/auth'

async function testBetterAuthSchema() {
  console.log('🧪 Testing Better Auth schema...')
  
  try {
    // Test if we can access the user table
    console.log('📋 User table schema:')
    console.log('Table name:', user._.name) // Should be "users"
    console.log('Columns:', Object.keys(user._.columns))
    
    // Test if we can query the table
    const userCount = await db.$count(user)
    console.log(`👥 Total users in database: ${userCount}`)
    
    // Test if email column exists
    const hasEmailColumn = 'email' in user._.columns
    console.log(`📧 Email column exists: ${hasEmailColumn}`)
    
    if (hasEmailColumn) {
      console.log('✅ Better Auth schema looks correct!')
    } else {
      console.log('❌ Email column missing from user schema')
    }
    
  } catch (error) {
    console.error('❌ Error testing Better Auth schema:', error)
  }
}

testBetterAuthSchema()