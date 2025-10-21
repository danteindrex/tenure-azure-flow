const { createClient } = require('@supabase/supabase-js');

class SupabaseSQLExecutor {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Execute SQL using the exec_sql RPC function
   * @param {string} sql - SQL query to execute
   * @returns {Promise<{success: boolean, result?: any, error?: string}>}
   */
  async executeSQL(sql) {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql_query: sql
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, result: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute multiple SQL statements
   * @param {string[]} sqlStatements - Array of SQL statements
   * @returns {Promise<{success: boolean, results?: any[], errors?: string[]}>}
   */
  async executeMultipleSQL(sqlStatements) {
    const results = [];
    const errors = [];

    for (const sql of sqlStatements) {
      const result = await this.executeSQL(sql);
      if (result.success) {
        results.push(result.result);
      } else {
        errors.push(result.error);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Create table with error handling
   * @param {string} tableName - Name of the table
   * @param {string} tableDefinition - Table definition SQL
   * @returns {Promise<{success: boolean, result?: any, error?: string}>}
   */
  async createTable(tableName, tableDefinition) {
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${tableDefinition});`;
    return await this.executeSQL(sql);
  }

  /**
   * Insert data into table
   * @param {string} tableName - Name of the table
   * @param {Object} data - Data to insert
   * @returns {Promise<{success: boolean, result?: any, error?: string}>}
   */
  async insertData(tableName, data) {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data).map(v => 
      typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
    ).join(', ');
    
    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${values});`;
    return await this.executeSQL(sql);
  }

  /**
   * Query data from table
   * @param {string} tableName - Name of the table
   * @param {string} columns - Columns to select (default: '*')
   * @param {string} whereClause - WHERE clause (optional)
   * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
   */
  async queryData(tableName, columns = '*', whereClause = '') {
    let sql = `SELECT ${columns} FROM ${tableName}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    sql += ';';

    const result = await this.executeSQL(sql);
    if (result.success) {
      // For SELECT queries, we need to use the regular Supabase client
      const { data, error } = await this.supabase
        .from(tableName)
        .select(columns);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    }
    
    return result;
  }

  /**
   * Check if table exists
   * @param {string} tableName - Name of the table
   * @returns {Promise<boolean>}
   */
  async tableExists(tableName) {
    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `;
    
    const result = await this.executeSQL(sql);
    return result.success && result.result === 'SQL executed successfully';
  }

  /**
   * Get table schema
   * @param {string} tableName - Name of the table
   * @returns {Promise<{success: boolean, schema?: any[], error?: string}>}
   */
  async getTableSchema(tableName) {
    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;
    
    const result = await this.executeSQL(sql);
    if (result.success) {
      // Use regular Supabase client for SELECT queries
      const { data, error } = await this.supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, schema: data };
    }
    
    return result;
  }
}

module.exports = SupabaseSQLExecutor;
