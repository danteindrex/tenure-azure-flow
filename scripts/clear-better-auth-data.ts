/**
 * Clear Better Auth data to allow UUID migration
 * 
 * This script clears the Better Auth tables so we can change the user_id 
 * columns from TEXT to UUID without data conversion issues.
 * 
 * This is safe because:
 * - Better Auth tables don't contain your main user data
 * - Your 'users' table with actual user data is preserved
 * - Users will just need to log in again
 */

import * as dotenv from 'dotenv'

// Load environment variables BEFORE importing db
dotenv.config({ path: '.env.local' })

import { db } from '../drizzle/db'
import { sql } from 'drizzle-orm'

async function clearBetterAuthData() {
  console.log('🧹 Clearing Better Auth data to allow UUID migration...')
  
  try {
    // Clear data from Better Auth tables (in correct order to respect foreign keys)
    await db.execute(sql`DELETE FROM two_factor`)
    console.log('✅ Cleared two_factor table')
    
    await db.execute(sql`DELETE FROM account`)
    console.log('✅ Cleared account table')
    
    await db.execute(sql`DELETE FROM session`)
    console.log('✅ Cleared session table')
    
    await db.execute(sql`DELETE FROM verification`)
    console.log('✅ Cleared verification table')
    
    console.log('✅ Better Auth data cleared successfully!')
    console.log('🚀 Now you can run: npm run db:push')
    console.log('ℹ️  Users will need to log in again, but all user data is preserved.')
    
  } catch (error) {
    console.error('❌ Error clearing Better Auth data:', error)
    process.exit(1)
  }
}

clearBetterAuthData()