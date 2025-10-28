import { useState, useCallback } from 'react';

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

  const executeSQL = useCallback(async (sql: string): Promise<SQLExecutionResult> => {
    setLoading(true);
    setError(null);

    try {
      // Route through API endpoint with Better Auth session
      const response = await fetch('/api/admin/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include Better Auth session cookie
        body: JSON.stringify({ sql_query: sql })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'SQL execution failed');
        return { success: false, error: data.error || 'SQL execution failed' };
      }

      return { success: true, result: data.result };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

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
