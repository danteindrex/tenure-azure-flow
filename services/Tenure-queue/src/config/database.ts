/**
 * Database configuration for Tenure Queue Service
 * Uses Drizzle ORM with PostgreSQL connection pool
 */

import { pool } from '../../drizzle/db';
import { Pool } from 'pg';

class DatabaseConnection {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  getPool(): Pool {
    return this.pool;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Simple query to test connection
      const result = await this.pool.query('SELECT 1 as connected');

      if (result.rows && result.rows.length > 0) {
        return { success: true, message: 'Database connection successful' };
      } else {
        throw new Error('No result from database');
      }
    } catch (error: any) {
      console.error('Database connection test failed:', error);
      return { success: false, message: error.message };
    }
  }

  async closePool(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database pool closed successfully');
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
  }
}

export default new DatabaseConnection();
