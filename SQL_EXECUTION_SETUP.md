# Supabase SQL Execution Setup Guide

## Overview
This guide shows you how to enable direct SQL execution capabilities in your Supabase client.

## Method 1: Manual Setup (Recommended)

### Step 1: Create the exec_sql function
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `exneyqwvvckzxqzlknxv`
3. Navigate to **SQL Editor**
4. Copy and paste this SQL:

```sql
-- Create a function to execute SQL
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text;
BEGIN
    -- Execute the SQL and return a success message
    EXECUTE sql_query;
    RETURN 'SQL executed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
```

5. Click **Run** to execute

### Step 2: Create the queue table
1. In the same SQL Editor, copy and paste the contents of `create-queue-table.sql`
2. Click **Run** to execute

### Step 3: Verify setup
Run this query to verify both were created:
```sql
SELECT 
  routine_name as function_name,
  'function' as type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'exec_sql'

UNION ALL

SELECT 
  table_name,
  'table' as type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'queue';
```

## Method 2: Using the Supabase Client

Once the `exec_sql` function is created, you can use it in your code:

### JavaScript/TypeScript
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Execute any SQL
const { data, error } = await supabase.rpc('exec_sql', {
  sql_query: 'SELECT * FROM queue LIMIT 5;'
});

console.log(data); // "SQL executed successfully"
```

### React Hook
```typescript
import { useSQLExecution } from '@/hooks/useSQLExecution';

function MyComponent() {
  const { executeSQL, loading, error } = useSQLExecution();

  const handleExecute = async () => {
    const result = await executeSQL('SELECT COUNT(*) FROM queue;');
    console.log(result);
  };

  return (
    <button onClick={handleExecute} disabled={loading}>
      Execute SQL
    </button>
  );
}
```

### API Route
```typescript
// pages/api/sql/execute.ts
export default async function handler(req, res) {
  const { sql } = req.body;
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  });
  
  res.json({ success: !error, result: data, error });
}
```

## Method 3: Using the SupabaseSQLExecutor Class

```javascript
import SupabaseSQLExecutor from './supabase-sql-executor';

const executor = new SupabaseSQLExecutor(url, key);

// Execute SQL
const result = await executor.executeSQL('SELECT * FROM queue;');

// Create table
await executor.createTable('my_table', 'id SERIAL PRIMARY KEY, name TEXT');

// Insert data
await executor.insertData('my_table', { name: 'John Doe' });

// Query data
const data = await executor.queryData('my_table', '*', 'id > 0');
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **SQL Injection**: The `exec_sql` function executes raw SQL, so always validate and sanitize input
2. **Permissions**: Only grant `exec_sql` access to trusted users
3. **Audit**: Consider logging all SQL executions for security auditing
4. **Validation**: Add input validation before calling `exec_sql`

## Example: Safe SQL Execution

```typescript
function safeExecuteSQL(sql: string) {
  // Validate SQL (basic example)
  const allowedKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  const firstWord = sql.trim().split(' ')[0].toUpperCase();
  
  if (!allowedKeywords.includes(firstWord)) {
    throw new Error('Only SELECT, INSERT, UPDATE, DELETE allowed');
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'EXEC'];
  if (dangerousPatterns.some(pattern => sql.toUpperCase().includes(pattern))) {
    throw new Error('Dangerous SQL operation not allowed');
  }
  
  return supabase.rpc('exec_sql', { sql_query: sql });
}
```

## Troubleshooting

### Common Issues

1. **"Function exec_sql does not exist"**
   - Make sure you created the function in Step 1
   - Check that you're using the correct database

2. **"Permission denied"**
   - Verify the GRANT statements were executed
   - Check your user has the correct role

3. **"SQL execution failed"**
   - Check your SQL syntax
   - Verify table/column names exist
   - Check for typos in the SQL

### Testing the Setup

```sql
-- Test the function
SELECT exec_sql('SELECT NOW() as current_time;');

-- Test creating a simple table
SELECT exec_sql('CREATE TABLE test_table (id SERIAL PRIMARY KEY, name TEXT);');

-- Test inserting data
SELECT exec_sql('INSERT INTO test_table (name) VALUES (''Hello World'');');

-- Test querying data
SELECT exec_sql('SELECT * FROM test_table;');

-- Clean up
SELECT exec_sql('DROP TABLE test_table;');
```

## Next Steps

After setting up SQL execution:

1. ✅ Your queue dashboard will work with real data
2. ✅ You can execute any SQL through your Supabase client
3. ✅ You have multiple ways to interact with the database
4. ✅ You can build more advanced database operations

The queue page at `http://localhost:3000/dashboard/queue` should now work properly!
