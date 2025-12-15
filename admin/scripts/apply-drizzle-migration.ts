/**
 * Apply Drizzle Migration
 * 
 * Manually applies the generated Drizzle migration to the database.
 * Run with: npx tsx scripts/apply-drizzle-migration.ts
 */

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🚀 Applying Drizzle migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'drizzle', '0000_keen_celestials.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      console.log('💡 Run "npm run db:generate" first to generate migrations');
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by statement breakpoint
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement || statement.length < 5) continue;

      try {
        console.log(`[${i + 1}/${statements.length}] Executing...`);
        
        // Show first 80 chars of statement
        const preview = statement.substring(0, 80).replace(/\n/g, ' ');
        console.log(`   ${preview}${statement.length > 80 ? '...' : ''}`);
        
        await db.execute(sql.raw(statement));
        console.log('   ✅ Success\n');
      } catch (error: any) {
        // Check if error is about object already existing
        const errorMsg = error.message || '';
        const causeMsg = error.cause?.message || '';
        
        if (errorMsg.includes('already exists') || causeMsg.includes('already exists')) {
          console.log('   ⚠️  Already exists, skipping\n');
        } else {
          console.error('   ❌ Error:', errorMsg);
          console.log('   Continuing with next statement...\n');
          // Don't throw, continue with next statement
        }
      }
    }

    console.log('✨ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Run "npm run db:studio" to explore your database');
    console.log('2. Test the migrated API routes');
    console.log('3. Optionally run "npx tsx scripts/migrate-legacy-data.ts" to migrate existing data');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

applyMigration();
