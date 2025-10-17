import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testConnection() {
  console.log('🔍 Testing Supabase Postgres connection...\n');

  const connectionString = process.env.DATABASE_URI;

  if (!connectionString) {
    console.error('❌ DATABASE_URI not found in environment variables');
    process.exit(1);
  }

  // Parse connection string to display info (without password)
  const dbUrl = new URL(connectionString);
  console.log('📊 Connection Details:');
  console.log(`   Host: ${dbUrl.hostname}`);
  console.log(`   Port: ${dbUrl.port}`);
  console.log(`   Database: ${dbUrl.pathname.slice(1)}`);
  console.log(`   User: ${dbUrl.username}\n`);

  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test basic connection
    console.log('⏳ Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to database!\n');

    // Get database version
    console.log('📋 Database Information:');
    const versionResult = await client.query('SELECT version()');
    console.log(`   PostgreSQL Version: ${versionResult.rows[0].version.split(',')[0]}\n`);

    // Check for existing Payload tables
    console.log('🔍 Checking for Payload CMS tables...');
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename LIKE 'payload_%'
      ORDER BY tablename;
    `);

    if (tablesResult.rows.length > 0) {
      console.log(`   Found ${tablesResult.rows.length} Payload tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
    } else {
      console.log('   ⚠️  No Payload tables found (database may not be initialized yet)');
    }
    console.log('');

    // Check all tables in public schema
    console.log('📊 All tables in public schema:');
    const allTablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    if (allTablesResult.rows.length > 0) {
      console.log(`   Found ${allTablesResult.rows.length} total tables:`);
      allTablesResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
    } else {
      console.log('   No tables found in public schema');
    }
    console.log('');

    // Check connection pool status
    console.log('🔌 Connection Pool Status:');
    console.log(`   Total: ${pool.totalCount}`);
    console.log(`   Idle: ${pool.idleCount}`);
    console.log(`   Waiting: ${pool.waitingCount}\n`);

    client.release();
    console.log('✅ Database connection test completed successfully!');

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
