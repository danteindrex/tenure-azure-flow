/**
 * Create Payouts Table
 * 
 * Creates the payouts table manually to avoid enum conflicts.
 */

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function createPayoutsTable() {
  console.log('🚀 Creating payouts table...\n');

  try {
    // Drop the table if it exists
    console.log('1. Dropping existing payouts table if exists...');
    await db.execute(sql`DROP TABLE IF EXISTS payouts CASCADE`);
    console.log('✅ Done\n');

    // Create the table
    console.log('2. Creating payouts table...');
    await db.execute(sql`
      CREATE TABLE "payouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "stripe_payout_id" varchar(255) UNIQUE,
        "amount" numeric(10, 2) NOT NULL,
        "currency" varchar(3) DEFAULT 'usd' NOT NULL,
        "status" varchar(50) DEFAULT 'pending' NOT NULL,
        "arrival_date" timestamp,
        "description" text,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Payouts table created successfully!\n');

    console.log('✨ Complete!\n');
    console.log('Next steps:');
    console.log('1. Run "npm run db:studio" to explore your database');
    console.log('2. Test the migrated API routes');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

createPayoutsTable();
