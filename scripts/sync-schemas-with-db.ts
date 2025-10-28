#!/usr/bin/env tsx

/**
 * Script to sync Drizzle schemas with actual database structure
 * This will introspect the database and update schema files to match exactly
 */

import { execSync } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'

const DATABASE_URL = process.env.DATABASE_URL!

// Tables that we need to check and update
const TABLES_TO_CHECK = [
  'users',
  'user_profiles', 
  'user_contacts',
  'user_addresses',
  'user_memberships',
  'membership_queue',
  'kyc_verification',
  'payout_management',
  'disputes',
  'tax_forms',
  'transaction_monitoring',
  'verification_codes',
  'user_payment_methods',
  'user_subscriptions', 
  'user_payments',
  'user_billing_schedules',
  'user_agreements',
  'system_audit_logs',
  'user_audit_logs',
  'organization',
  'organization_member',
  'organization_invitation',
  'user_settings',
  'user_privacy_settings',
  'user_security_settings',
  'user_notification_preferences',
  'user_appearance_settings',
  'user_payment_settings'
]

async function getTableStructure(tableName: string) {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_name = '${tableName}' 
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `
  
  const cmd = `PGPASSWORD=keithtwesigye74 psql -h aws-1-us-east-1.pooler.supabase.com -p 5432 -U postgres.exneyqwvvckzxqzlknxv -d postgres -t -c "${query}"`
  
  try {
    const result = execSync(cmd, { encoding: 'utf8' })
    return result.trim().split('\n').filter(line => line.trim()).map(line => {
      const parts = line.split('|').map(p => p.trim())
      return {
        column_name: parts[0],
        data_type: parts[1],
        is_nullable: parts[2] === 'YES',
        column_default: parts[3] === '' ? null : parts[3],
        character_maximum_length: parts[4] === '' ? null : parseInt(parts[4]),
        numeric_precision: parts[5] === '' ? null : parseInt(parts[5]),
        numeric_scale: parts[6] === '' ? null : parseInt(parts[6])
      }
    })
  } catch (error) {
    console.error(`Error getting structure for table ${tableName}:`, error)
    return []
  }
}

function mapDataType(column: any): string {
  const { data_type, character_maximum_length, numeric_precision, numeric_scale } = column
  
  switch (data_type) {
    case 'uuid':
      return "uuid('id')"
    case 'text':
      return "text('column_name')"
    case 'character varying':
      return character_maximum_length 
        ? `varchar('column_name', { length: ${character_maximum_length} })`
        : "varchar('column_name')"
    case 'character':
      return character_maximum_length 
        ? `char('column_name', { length: ${character_maximum_length} })`
        : "char('column_name')"
    case 'boolean':
      return "boolean('column_name')"
    case 'integer':
      return "integer('column_name')"
    case 'numeric':
      return numeric_precision && numeric_scale
        ? `decimal('column_name', { precision: ${numeric_precision}, scale: ${numeric_scale} })`
        : "decimal('column_name')"
    case 'timestamp with time zone':
      return "timestamp('column_name', { withTimezone: true })"
    case 'date':
      return "date('column_name')"
    case 'jsonb':
      return "jsonb('column_name')"
    case 'inet':
      return "text('column_name')" // Using text for inet for simplicity
    case 'USER-DEFINED':
      return "text('column_name')" // For enums, use text
    default:
      return "text('column_name')"
  }
}

async function main() {
  console.log('🔍 Introspecting database structure...')
  
  for (const tableName of TABLES_TO_CHECK) {
    console.log(`\n📋 Checking table: ${tableName}`)
    const columns = await getTableStructure(tableName)
    
    if (columns.length === 0) {
      console.log(`⚠️  Table ${tableName} not found or empty`)
      continue
    }
    
    console.log(`✅ Found ${columns.length} columns in ${tableName}:`)
    columns.forEach(col => {
      const type = mapDataType(col).replace('column_name', col.column_name)
      const nullable = col.is_nullable ? '' : '.notNull()'
      const defaultVal = col.column_default ? `.default(${col.column_default})` : ''
      console.log(`  ${col.column_name}: ${type}${nullable}${defaultVal}`)
    })
  }
  
  console.log('\n✨ Database introspection complete!')
  console.log('📝 Please manually update your schema files based on the output above.')
}

main().catch(console.error)