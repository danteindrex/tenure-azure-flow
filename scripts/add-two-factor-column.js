import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addTwoFactorColumn() {
  try {
    console.log('Adding twoFactorEnabled column to user table...');
    
    // Check if column already exists
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'twoFactorEnabled'
      );
    `);
    
    if (columnCheck.rows[0].exists) {
      console.log('✅ twoFactorEnabled column already exists');
      return;
    }
    
    // Add the column
    await pool.query(`
      ALTER TABLE "user" 
      ADD COLUMN "twoFactorEnabled" boolean NOT NULL DEFAULT false;
    `);
    
    console.log('✅ Successfully added twoFactorEnabled column to user table');
    
  } catch (error) {
    console.error('❌ Failed to add column:', error.message);
  } finally {
    await pool.end();
  }
}

addTwoFactorColumn();