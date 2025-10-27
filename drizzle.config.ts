/**
 * Drizzle Kit Configuration
 *
 * This configuration tells Drizzle Kit how to:
 * - Connect to your database
 * - Find your schema definitions
 * - Generate migrations
 * - Push schema changes
 *
 * IMPORTANT: When generating migrations, Drizzle will:
 * - Only create NEW tables (Better Auth tables, organization tables)
 * - NOT modify existing tables (all your current tables are safe)
 * - Generate SQL that you can review before applying
 */

import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

export default {
  // Schema location - where your table definitions are
  schema: './drizzle/schema/index.ts',

  // Output directory for generated migrations
  out: './drizzle/migrations',

  // Database dialect
  dialect: 'postgresql',

  // Database connection
  dbCredentials: {
    url: process.env.DATABASE_URL! + '?sslmode=no-verify'
  },

  // Schema filtering - only work with public schema
  schemaFilter: ['public'],

  // Verbose logging for debugging
  verbose: true,

  // Strict mode - catch potential issues
  strict: true
} satisfies Config
