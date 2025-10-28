/**
 * Clean up conflicting Better Auth tables
 * 
 * This script removes the old Better Auth tables that conflict with our schema
 * so we can recreate them properly to work with your existing 'users' table.
 */

import * as dotenv from 'dotenv'
import { db } from '../drizzle/db'
import { sql } from 'drizzle-orm'

// Load environment variables BEFORE importing db
dotenv.config({ path: '.env.local' })

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

async function cleanupBetterAuthTables() {
  console.log('🧹 Cleaning up conflicting Better Auth tables...')
  
  try {
    // Drop existing Better Auth tables in correct order (respecting foreign keys)
    const tables = [
      'organization_invitation',
      'organization_member', 
      'organization',
      'two_factor',
      'account',
      'session',
      'verification',
      'passkey',
      'user' // This is the conflicting table (singular)
    ]
    
    for (const table of tables) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`))
        console.log(`✅ Dropped table: ${table}`)
      } catch (error) {
        console.log(`⚠️  Table ${table} doesn't exist or couldn't be dropped:`, error.message)
      }
    }
    
    console.log('✅ Cleanup completed! Your "users" table (plural) with data is preserved.')
    console.log('🚀 Now you can run: npm run db:push')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

cleanupBetterAuthTables()