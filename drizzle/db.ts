/**
 * Drizzle Database Client
 *
 * This file creates and exports the database connection using Drizzle ORM.
 * It provides type-safe access to all your database tables.
 *
 * Features:
 * - Connection pooling for performance
 * - SSL support for secure connections
 * - Type-safe queries with full autocomplete
 * - Automatic schema inference
 *
 * Usage:
 * ```typescript
 * import { db } from '@/drizzle/db'
 *
 * // Query with relations
 * const user = await db.query.users.findFirst({
 *   where: eq(users.email, 'user@example.com'),
 *   with: {
 *     profile: true,
 *     memberships: true
 *   }
 * })
 *
 * // Insert data
 * await db.insert(users).values({
 *   email: 'new@example.com',
 *   status: 'Pending'
 * })
 * ```
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Validate environment variables
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Please add it to your .env file:\n' +
    'DATABASE_URL=postgresql://user:password@host:port/database'
  )
}

// Create PostgreSQL connection pool optimized for Supabase Transaction Mode
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
  // Optimized settings for unstable connections
  max: 10, // Max number of clients in the pool
  min: 2, // Minimum number of clients to keep idle
  idleTimeoutMillis: 60000, // Close idle clients after 60 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds to connect
  //acquireTimeoutMillis: 10000, // Wait 10 seconds to acquire a client
})

// Log pool errors but don't exit process
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
  // Don't exit process, let the pool handle reconnection
})

// Create Drizzle instance with schema
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development' // Enable query logging in development
})

// Test connection on startup
pool.on('connect', (client) => {
  console.log('✅ Database connected successfully')
})

pool.on('error', (err, client) => {
  console.error('❌ Database connection error:', err.message)
  // Don't exit process, let the pool handle reconnection
})

// Export pool for advanced usage
export { pool }

// Export schema for convenience
export * from './schema'
