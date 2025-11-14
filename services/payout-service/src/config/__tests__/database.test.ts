/**
 * Database Configuration Tests
 * 
 * Tests for database connection and health check functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDatabaseStats } from '../database'

describe('Database Configuration', () => {
  it('should return database statistics', () => {
    const stats = getDatabaseStats()
    expect(stats).toHaveProperty('totalCount')
    expect(stats).toHaveProperty('idleCount')
    expect(stats).toHaveProperty('waitingCount')
    expect(typeof stats.totalCount).toBe('number')
  })

  it('should have database configuration loaded', () => {
    expect(process.env.DATABASE_URL).toBeDefined()
  })
})
