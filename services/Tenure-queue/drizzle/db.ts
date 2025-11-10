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
  console.warn('⚠️  DATABASE_URL is not set. Using fallback for build process.')
  // Use a dummy connection string for build process
  process.env.DATABASE_URL = 'postgresql://localhost:5432/dummy'
}

// For serverless (Vercel), prefer Transaction Mode (port 6543) over Session Mode (port 5432)
// Transaction Mode is faster and handles more concurrent connections
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
const connectionString = process.env.DATABASE_URL

// Log which mode we're using
if (isServerless && connectionString?.includes(':5432')) {
  console.warn('⚠️ Using Session Mode (port 5432) in serverless. Consider switching to Transaction Mode (port 6543) for better performance.')
  console.warn('   Update DATABASE_URL to use port 6543 instead of 5432')
}

// Create PostgreSQL connection pool optimized for Vercel serverless + Supabase
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
  // Optimized settings for development and serverless environments
  max: isServerless ? 1 : 10, // 1 connection per serverless instance, 10 for local dev
  min: 0, // No idle connections in serverless
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 20000, // Wait 20 seconds to connect
  allowExitOnIdle: true, // Allow pool to close when idle (important for serverless)
})

// Log pool errors but don't exit process
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
  // Don't exit process, let the pool handle reconnection
})

// Test connection on startup (only log in development to avoid noise)
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', () => {
    console.log('✅ Database connected successfully')
  })
}

// Create Drizzle instance with schema
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development' // Enable query logging in development
})

// Export pool for advanced usage
export { pool }

// Export schema for convenience
export * from './schema'
