const { Client } = require('pg');
const fs = require('fs');

const connectionString = 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

async function analyzeLiveSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to live Supabase database\n');

    // Get all tables with row counts
    const tablesQuery = `
      SELECT
        schemaname,
        tablename,
        (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
      FROM (
        SELECT
          table_schema as schemaname,
          table_name as tablename,
          table_schema || '.' || table_name as full_name,
          query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name), false, true, '') as xml_count
        FROM information_schema.tables
        WHERE table_schema IN ('public', 'auth')
        AND table_type = 'BASE TABLE'
      ) t
      ORDER BY schemaname, tablename;
    `;

    const tables = await client.query(tablesQuery);

    console.log('='.repeat(80));
    console.log('DATABASE TABLES & ROW COUNTS');
    console.log('='.repeat(80));

    const schema = {
      schemas: {},
      enums: {},
      metadata: {
        analyzed_at: new Date().toISOString(),
        total_tables: tables.rows.length
      }
    };

    for (const table of tables.rows) {
      const { schemaname, tablename, row_count } = table;
      console.log(`\n📊 ${schemaname}.${tablename} (${row_count} rows)`);

      // Get columns
      const columnsQuery = `
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;
      const columns = await client.query(columnsQuery, [schemaname, tablename]);

      // Get primary keys
      const pkQuery = `
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary;
      `;
      const pks = await client.query(pkQuery, [`${schemaname}.${tablename}`]);

      // Get foreign keys
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2;
      `;
      const fks = await client.query(fkQuery, [schemaname, tablename]);

      if (!schema.schemas[schemaname]) {
        schema.schemas[schemaname] = {};
      }

      schema.schemas[schemaname][tablename] = {
        row_count,
        columns: columns.rows,
        primary_keys: pks.rows.map(r => r.attname),
        foreign_keys: fks.rows
      };

      console.log(`   Columns: ${columns.rows.length}, PKs: ${pks.rows.length}, FKs: ${fks.rows.length}`);
    }

    // Get enums
    const enumsQuery = `
      SELECT
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `;
    const enums = await client.query(enumsQuery);

    console.log('\n' + '='.repeat(80));
    console.log('ENUMS');
    console.log('='.repeat(80));
    for (const enumRow of enums.rows) {
      console.log(`${enumRow.enum_name}: [${enumRow.enum_values.join(', ')}]`);
      schema.enums[enumRow.enum_name] = enumRow.enum_values;
    }

    // Save to file
    fs.writeFileSync('live-database-schema.json', JSON.stringify(schema, null, 2));
    console.log('\n✅ Schema saved to live-database-schema.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

analyzeLiveSchema();
