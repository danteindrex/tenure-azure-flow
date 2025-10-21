const { Client } = require('pg');

// Database connection
const client = new Client({
  connectionString: 'postgresql://postgres:Kakai2018@db.exneyqwvvckzxqzlknxv.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDatabaseSchema() {
  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Check all tables in public schema
    console.log('\n📋 EXISTING TABLES IN PUBLIC SCHEMA:');
    console.log('=====================================');
    
    const tablesQuery = `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found in public schema');
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name} (${row.table_type})`);
      });
    }

    // Check each table's columns
    console.log('\n🔍 TABLE STRUCTURES:');
    console.log('====================');
    
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      console.log(`\n📊 Table: ${tableName}`);
      console.log('-'.repeat(50));
      
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery, [tableName]);
      
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`  • ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      
      // Check row count
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  📈 Rows: ${countResult.rows[0].count}`);
      } catch (err) {
        console.log(`  ⚠️  Could not count rows: ${err.message}`);
      }
    }

    // Check indexes
    console.log('\n🔗 INDEXES:');
    console.log('===========');
    
    const indexesQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    
    const indexesResult = await client.query(indexesQuery);
    
    indexesResult.rows.forEach(idx => {
      console.log(`${idx.tablename}.${idx.indexname}`);
      console.log(`  ${idx.indexdef}`);
    });

    // Check triggers
    console.log('\n⚡ TRIGGERS:');
    console.log('============');
    
    const triggersQuery = `
      SELECT 
        trigger_name,
        event_object_table,
        action_timing,
        event_manipulation
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `;
    
    const triggersResult = await client.query(triggersQuery);
    
    if (triggersResult.rows.length === 0) {
      console.log('No triggers found');
    } else {
      triggersResult.rows.forEach(trigger => {
        console.log(`${trigger.event_object_table}: ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });
    }

    // Check RLS policies
    console.log('\n🔒 ROW LEVEL SECURITY POLICIES:');
    console.log('===============================');
    
    const rlsQuery = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const rlsResult = await client.query(rlsQuery);
    
    if (rlsResult.rows.length === 0) {
      console.log('No RLS policies found');
    } else {
      rlsResult.rows.forEach(policy => {
        console.log(`${policy.tablename}.${policy.policyname} (${policy.cmd})`);
        if (policy.qual) {
          console.log(`  Condition: ${policy.qual}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the schema check
checkDatabaseSchema().catch(console.error);