/**
 * Database Configuration Module
 * 
 * This module initializes the PostgreSQL connection pool and Drizzle ORM client
 * for the Payout Service. It uses the same database as the main application
 * and shares the schema definitions.
 * 
 * Features:
 * - Connection pooling optimized for microservices
 * - SSL support for secure connections
 * - Health check functionality
 * - Proper error handling and logging
 * - Graceful shutdown support
 * 
 * Usage:
 * ```typescript
 * import { db, checkDatabaseHealth } from '@/config/database'
 * 
 * // Query database
 * const payouts = await db.query.payoutManagement.findMany()
 * 
 * // Check health
 * const isHealthy = await checkDatabaseHealth()
 * ```
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../../drizzle/schema'
import { logger } from '../utils/logger'

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Please add it to your .env file:\n' +
    'DATABASE_URL=postgresql://user:password@host:port/database'
  )
}

const connectionString = process.env.DATABASE_URL

// Create PostgreSQL connection pool optimized for microservices
// These settings balance performance with resource usage
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Use SSL for secure connections
  // Connection pool settings for microservice
  max: 10, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients to keep in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Wait 5 seconds to connect before timing out
  allowExitOnIdle: false, // Keep pool alive for long-running service
})

// Handle pool errors gracefully
pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', {
    error: err.message,
    stack: err.stack
  })
  // Don't exit process, let the pool handle reconnection
})

// Log successful connections in development
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', () => {
    logger.info('✅ Database client connected')
  })
}

// Create Drizzle ORM instance with schema
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development' // Enable query logging in development
})

// Export pool for advanced usage and cleanup
export { pool }

// Export schema for convenience
export * from '../../drizzle/schema'

/**
 * Check database connection health
 * 
 * This function attempts to execute a simple query to verify
 * that the database connection is working properly.
 * 
 * @returns Promise<boolean> - True if database is healthy, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Execute a simple query to test connection
    const result = await pool.query('SELECT NOW() as current_time')
    
    if (result.rows.length > 0) {
      logger.debug('Database health check passed', {
        timestamp: result.rows[0].current_time
      })
      return true
    }
    
    logger.warn('Database health check returned no rows')
    return false
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return false
  }
}

/**
 * Get database connection statistics
 * 
 * Returns information about the current state of the connection pool.
 * Useful for monitoring and debugging.
 * 
 * @returns Object containing pool statistics
 */
export function getDatabaseStats() {
  return {
    totalCount: pool.totalCount, // Total number of clients in the pool
    idleCount: pool.idleCount, // Number of idle clients
    waitingCount: pool.waitingCount, // Number of queued requests waiting for a client
  }
}

/**
 * Gracefully close database connections
 * 
 * This function should be called when shutting down the service
 * to ensure all database connections are properly closed.
 * 
 * @returns Promise<void>
 */
export async function closeDatabaseConnections(): Promise<void> {
  try {
    logger.info('Closing database connections...')
    await pool.end()
    logger.info('✅ Database connections closed successfully')
  } catch (error) {
    logger.error('Error closing database connections', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// Handle process termination signals for graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connections')
  await closeDatabaseConnections()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connections')
  await closeDatabaseConnections()
  process.exit(0)
})
