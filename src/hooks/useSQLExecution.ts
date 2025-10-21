import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface SQLExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

interface UseSQLExecutionReturn {
  executeSQL: (sql: string) => Promise<SQLExecutionResult>;
  executeMultipleSQL: (sqlStatements: string[]) => Promise<SQLExecutionResult[]>;
  loading: boolean;
  error: string | null;
}

export const useSQLExecution = (): UseSQLExecutionReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabaseClient();

  const executeSQL = useCallback(async (sql: string): Promise<SQLExecutionResult> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('exec_sql', {
        sql_query: sql
      });

      if (rpcError) {
        setError(rpcError.message);
        return { success: false, error: rpcError.message };
      }

      return { success: true, result: data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const executeMultipleSQL = useCallback(async (sqlStatements: string[]): Promise<SQLExecutionResult[]> => {
    setLoading(true);
    setError(null);

    const results: SQLExecutionResult[] = [];

    for (const sql of sqlStatements) {
      const result = await executeSQL(sql);
      results.push(result);
    }

    setLoading(false);
    return results;
  }, [executeSQL]);

  return {
    executeSQL,
    executeMultipleSQL,
    loading,
    error
  };
};
