/**
 * Eligibility Checker Service Tests
 * 
 * Unit tests for the EligibilityChecker service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EligibilityChecker } from '../../src/services/eligibility-checker.service'

// Mock the database module
vi.mock('../../src/config/database', () => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
    insert: vi.fn()
  },
  userPayments: {
    amount: 'amount',
    status: 'status'
  },
  adminAlerts: {},
  userAuditLogs: {}
}))

// Mock the logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  },
  redactSensitiveData: vi.fn((data) => data)
}))

describe('EligibilityChecker', () => {
  let checker: EligibilityChecker
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables
    process.env = {
      ...originalEnv,
      BUSINESS_LAUNCH_DATE: '2023-01-01',
      PAYOUT_THRESHOLD: '100000',
      REWARD_PER_WINNER: '100000'
    }

    checker = new EligibilityChecker()
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getTotalRevenue', () => {
    it('should return total revenue from succeeded payments', async () => {
      const { db } = await import('../../src/config/database')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalRevenue: '250000.00' }])
        })
      })
      vi.mocked(db.select).mockImplementation(mockSelect)

      const revenue = await checker.getTotalRevenue()

      expect(revenue).toBe(250000)
    })

    it('should return 0 when no payments exist', async () => {
      const { db } = await import('../../src/config/database')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalRevenue: '0' }])
        })
      })
      vi.mocked(db.select).mockImplementation(mockSelect)

      const revenue = await checker.getTotalRevenue()

      expect(revenue).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      const { db } = await import('../../src/config/database')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      })
      vi.mocked(db.select).mockImplementation(mockSelect)

      await expect(checker.getTotalRevenue()).rejects.toThrow('Failed to calculate total revenue')
    })
  })

  describe('getCompanyAge', () => {
    it('should calculate company age in months correctly', () => {
      // Set launch date to 24 months ago
      const launchDate = new Date()
      launchDate.setMonth(launchDate.getMonth() - 24)
      process.env.BUSINESS_LAUNCH_DATE = launchDate.toISOString().split('T')[0]
      
      const newChecker = new EligibilityChecker()
      const age = newChecker.getCompanyAge()

      expect(age).toBeGreaterThanOrEqual(23)
      expect(age).toBeLessThanOrEqual(25)
    })

    it('should return 0 for company launched today', () => {
      process.env.BUSINESS_LAUNCH_DATE = new Date().toISOString().split('T')[0]
      
      const newChecker = new EligibilityChecker()
      const age = newChecker.getCompanyAge()

      expect(age).toBe(0)
    })
  })

  describe('calculatePotentialWinners', () => {
    it('should calculate correct number of winners for revenue >= 100K', () => {
      expect(checker.calculatePotentialWinners(100000)).toBe(1)
      expect(checker.calculatePotentialWinners(250000)).toBe(2)
      expect(checker.calculatePotentialWinners(500000)).toBe(5)
    })

    it('should return 0 for revenue < 100K', () => {
      expect(checker.calculatePotentialWinners(99999)).toBe(0)
      expect(checker.calculatePotentialWinners(50000)).toBe(0)
      expect(checker.calculatePotentialWinners(0)).toBe(0)
    })

    it('should use Math.floor for partial amounts', () => {
      expect(checker.calculatePotentialWinners(199999)).toBe(1)
      expect(checker.calculatePotentialWinners(299999)).toBe(2)
    })
  })

  describe('checkEligibility', () => {
    it('should return eligible when revenue >= 100K and age >= 12 months', async () => {
      // Mock revenue
      const { db } = await import('../../src/config/database')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalRevenue: '250000.00' }])
        })
      })
      vi.mocked(db.select).mockImplementation(mockSelect)

      // Mock eligible member count
      vi.mocked(db.execute).mockResolvedValue({
        rows: [{ count: '5' }]
      } as any)

      // Set company age to 13 months
      const launchDate = new Date()
      launchDate.setMonth(launchDate.getMonth() - 13)
      process.env.BUSINESS_LAUNCH_DATE = launchDate.toISOString().split('T')[0]
      
      const newChecker = new EligibilityChecker()
      const result = await newChecker.checkEligibility()

      expect(result.isEligible).toBe(true)
      expect(result.meetsRevenueRequirement).toBe(true)
      expect(result.meetsTimeRequirement).toBe(true)
      expect(result.potentialWinners).toBe(2)
      expect(result.eligibleMemberCount).toBe(5)
      expect(result.reason).toBeUndefined()
    })

    it('should return not eligible when revenue < 100K', async () => {
      const { db } = await import('../../src/config/database')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalRevenue: '50000.00' }])
        })
      })
      vi.mocked(db.select).mockImplementation(mockSelect)

      const result = await checker.checkEligibility()

      expect(result.isEligible).toBe(false)
      expect(result.meetsRevenueRequirement).toBe(false)
      expect(result.reason).toContain('Revenue shortfall')
    })
  })

  describe('getEligibleMembers', () => {
    it('should return list of eligible members from view', async () => {
      const { db } = await import('../../src/config/database')
      vi.mocked(db.execute).mockResolvedValue({
        rows: [
          {
            user_id: 'user-1',
            email: 'user1@example.com',
            full_name: 'John Doe',
            queue_position: 1,
            tenure_start_date: new Date('2023-01-01'),
            total_successful_payments: 12,
            lifetime_payment_total: '1200.00',
            subscription_status: 'active'
          },
          {
            user_id: 'user-2',
            email: 'user2@example.com',
            full_name: 'Jane Smith',
            queue_position: 2,
            tenure_start_date: new Date('2023-02-01'),
            total_successful_payments: 11,
            lifetime_payment_total: '1100.00',
            subscription_status: 'active'
          }
        ]
      } as any)

      const members = await checker.getEligibleMembers()

      expect(members).toHaveLength(2)
      expect(members[0].userId).toBe('user-1')
      expect(members[0].queuePosition).toBe(1)
      expect(members[1].userId).toBe('user-2')
    })

    it('should handle empty result set', async () => {
      const { db } = await import('../../src/config/database')
      vi.mocked(db.execute).mockResolvedValue({
        rows: []
      } as any)

      const members = await checker.getEligibleMembers()

      expect(members).toHaveLength(0)
    })
  })

  describe('createAdminAlert', () => {
    it('should create admin alert when eligible', async () => {
      const { db } = await import('../../src/config/database')
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'alert-123' }])
        })
      })
      vi.mocked(db.insert).mockImplementation(mockInsert)

      const eligibilityResult = {
        isEligible: true,
        totalRevenue: 250000,
        companyAgeMonths: 13,
        potentialWinners: 2,
        eligibleMemberCount: 5,
        nextCheckDate: new Date(),
        meetsRevenueRequirement: true,
        meetsTimeRequirement: true,
        revenueThreshold: 100000,
        timeThresholdMonths: 12
      }

      const alertId = await checker.createAdminAlert(eligibilityResult)

      expect(alertId).toBe('alert-123')
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('logEligibilityCheck', () => {
    it('should log eligibility check to audit trail', async () => {
      const { db } = await import('../../src/config/database')
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([])
      })
      vi.mocked(db.insert).mockImplementation(mockInsert)

      const eligibilityResult = {
        isEligible: true,
        totalRevenue: 250000,
        companyAgeMonths: 13,
        potentialWinners: 2,
        eligibleMemberCount: 5,
        nextCheckDate: new Date(),
        meetsRevenueRequirement: true,
        meetsTimeRequirement: true,
        revenueThreshold: 100000,
        timeThresholdMonths: 12
      }

      await checker.logEligibilityCheck(eligibilityResult, 'alert-123')

      expect(mockInsert).toHaveBeenCalled()
    })

    it('should not throw on logging failure', async () => {
      const { db } = await import('../../src/config/database')
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error'))
      })
      vi.mocked(db.insert).mockImplementation(mockInsert)

      const eligibilityResult = {
        isEligible: true,
        totalRevenue: 250000,
        companyAgeMonths: 13,
        potentialWinners: 2,
        eligibleMemberCount: 5,
        nextCheckDate: new Date(),
        meetsRevenueRequirement: true,
        meetsTimeRequirement: true,
        revenueThreshold: 100000,
        timeThresholdMonths: 12
      }

      await expect(checker.logEligibilityCheck(eligibilityResult)).resolves.not.toThrow()
    })
  })
})
