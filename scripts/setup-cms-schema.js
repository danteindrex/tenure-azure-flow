import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: 'services/cms/.env' });

const { Client } = pg;

async function setupCMSSchema() {
  console.log('🗄️  Setting up CMS database schema...');

  const client = new Client({
    connectionString: process.env.DATABASE_URI,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create CMS schema if it doesn't exist
    await client.query('CREATE SCHEMA IF NOT EXISTS cms;');
    console.log('✅ CMS schema created/verified');

    // Grant permissions
    await client.query('GRANT ALL ON SCHEMA cms TO postgres;');
    await client.query('GRANT ALL ON ALL TABLES IN SCHEMA cms TO postgres;');
    await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA cms TO postgres;');
    console.log('✅ Permissions granted');

    console.log('🎉 CMS schema setup completed!');
    console.log('📝 You can now start the CMS server');

  } catch (error) {
    console.error('❌ Error setting up CMS schema:', error.message);
  } finally {
    await client.end();
  }
}

setupCMSSchema();