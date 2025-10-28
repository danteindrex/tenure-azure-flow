/**
 * Check Users Table Schema
 * 
 * This script checks what columns exist in the users table
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../drizzle/db'
import { sql } from 'drizzle-orm'

async function checkUsersTable() {
  console.log('🔍 Checking users table schema...')
  
  try {
    // Get table schema
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)

    console.log('\n📋 Users table columns:')
    console.log('┌─────────────────────────┬─────────────────┬─────────────┬─────────────────────┐')
    console.log('│ Column Name             │ Data Type       │ Nullable    │ Default             │')
    console.log('├─────────────────────────┼─────────────────┼─────────────┼─────────────────────┤')
    
    columns.rows.forEach((row: any) => {
      const name = row.column_name.padEnd(23)
      const type = row.data_type.padEnd(15)
      const nullable = row.is_nullable.padEnd(11)
      const defaultVal = (row.column_default || 'NULL').padEnd(19)
      console.log(`│ ${name} │ ${type} │ ${nullable} │ ${defaultVal} │`)
    })
    
    console.log('└─────────────────────────┴─────────────────┴─────────────┴─────────────────────┘')

    // Check for Better Auth required columns
    const columnNames = columns.rows.map((row: any) => row.column_name)
    const requiredColumns = ['id', 'email', 'name', 'email_verified', 'created_at', 'updated_at']
    
    console.log('\n🔍 Better Auth column check:')
    requiredColumns.forEach(col => {
      const exists = columnNames.includes(col)
      const status = exists ? '✅' : '❌'
      console.log(`${status} ${col}`)
    })

    // Check if any columns are missing
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))
    if (missingColumns.length > 0) {
      console.log(`\n❌ Missing columns: ${missingColumns.join(', ')}`)
      console.log('💡 This is why Better Auth can\'t find the email field!')
    } else {
      console.log('\n✅ All required columns exist!')
    }

  } catch (error: any) {
    console.error('❌ Error checking users table:', error.message)
  }
}

checkUsersTable()