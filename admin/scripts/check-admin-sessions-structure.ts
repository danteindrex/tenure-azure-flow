import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function checkTable() {
  try {
    console.log('Checking admin_sessions table structure...\n');
    
    const structure = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'admin_sessions'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns:');
    structure.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkTable();
