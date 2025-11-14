/**
 * Test Setup
 * 
 * Sets up environment variables and mocks for testing
 */

import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Set default test environment variables if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret'
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret'
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test'
}

if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'error' // Reduce log noise in tests
}
