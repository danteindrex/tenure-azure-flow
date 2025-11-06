"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.db = void 0;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema = __importStar(require("./schema"));
// Validate environment variables
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Please add it to your .env file:\n' +
        'DATABASE_URL=postgresql://user:password@host:port/database');
}
// For serverless (Vercel), prefer Transaction Mode (port 6543) over Session Mode (port 5432)
// Transaction Mode is faster and handles more concurrent connections
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const connectionString = process.env.DATABASE_URL;
// Log which mode we're using
if (isServerless && connectionString?.includes(':5432')) {
    console.warn('⚠️ Using Session Mode (port 5432) in serverless. Consider switching to Transaction Mode (port 6543) for better performance.');
    console.warn('   Update DATABASE_URL to use port 6543 instead of 5432');
}
// Create PostgreSQL connection pool optimized for Vercel serverless + Supabase
const pool = new pg_1.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
    // Optimized settings for serverless environments (Vercel)
    max: 1, // Only 1 connection per serverless function instance
    min: 0, // No idle connections in serverless
    idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
    connectionTimeoutMillis: 5000, // Wait 5 seconds to connect
    allowExitOnIdle: true, // Allow pool to close when idle (important for serverless)
});
exports.pool = pool;
// Log pool errors but don't exit process
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    // Don't exit process, let the pool handle reconnection
});
// Test connection on startup (only log in development to avoid noise)
if (process.env.NODE_ENV === 'development') {
    pool.on('connect', () => {
        console.log('✅ Database connected successfully');
    });
}
// Create Drizzle instance with schema
exports.db = (0, node_postgres_1.drizzle)(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development' // Enable query logging in development
});
// Export schema for convenience
__exportStar(require("./schema"), exports);
//# sourceMappingURL=db.js.map