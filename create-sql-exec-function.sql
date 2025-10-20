-- =====================================================
-- Create SQL Execution Function for Supabase
-- =====================================================
-- This creates a function that allows executing arbitrary SQL
-- through the Supabase RPC interface
-- =====================================================

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

-- Add comment
COMMENT ON FUNCTION exec_sql(text) IS 'Executes arbitrary SQL queries through RPC interface';
