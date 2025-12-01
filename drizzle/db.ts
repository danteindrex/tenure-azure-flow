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

// Lazy initialization - only create pool/db when actually used at runtime
// This prevents errors during Next.js build when DATABASE_URL isn't set
let pool: Pool | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getPool(): Pool {
  if (pool) return pool

  // Validate environment variables at runtime, not module load time
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your .env file:\n' +
      'DATABASE_URL=postgresql://user:password@host:port/database'
    )
  }

  // For serverless (Vercel), prefer Transaction Mode (port 6543) over Session Mode (port 5432)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  const connectionString = process.env.DATABASE_URL

  // Log which mode we're using
  if (isServerless && connectionString?.includes(':5432')) {
    console.warn('⚠️ Using Session Mode (port 5432) in serverless. Consider switching to Transaction Mode (port 6543) for better performance.')
    console.warn('   Update DATABASE_URL to use port 6543 instead of 5432')
  }

  // Create PostgreSQL connection pool optimized for Vercel serverless + Supabase
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
    // Optimized settings for serverless environments (Vercel)
    max: 1, // Only 1 connection per serverless function instance
    min: 0, // No idle connections in serverless
    idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
    connectionTimeoutMillis: 5000, // Wait 5 seconds to connect
    allowExitOnIdle: true, // Allow pool to close when idle (important for serverless)
  })

  // Log pool errors but don't exit process
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err)
  })

  // Test connection on startup (only log in development)
  if (process.env.NODE_ENV === 'development') {
    pool.on('connect', () => {
      console.log('✅ Database connected successfully')
    })
  }

  return pool
}

// Create Drizzle instance lazily
function getDb() {
  if (_db) return _db
  _db = drizzle(getPool(), {
    schema,
    logger: process.env.NODE_ENV === 'development'
  })
  return _db
}

// Export db as a getter that initializes lazily
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as any)[prop]
  }
})

// Export pool getter for advanced usage
export { getPool as pool }

// Export schema for convenience
export * from './schema'
