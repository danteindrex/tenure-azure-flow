/**
 * Winner Selector Service Tests
 * 
 * Tests for winner selection, validation, and payout record creation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WinnerSelector } from '../../src/services/winner-selector.service'
import { db } from '../../src/config/database'
import { Winner, ValidationResult } from '../../src/types/winner.types'

// Mock the database
vi.mock('../../src/config/database', () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn()
  },
  kycVerification: {},
  userSubscriptions: {},
  payoutManagement: {}
}))

// Mock the logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('WinnerSelector', () => {
  let winnerSelector: WinnerSelector

  beforeEach(() => {
    winnerSelector = new WinnerSelector()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getEligibleMembers', () => {
    it('should return eligible members ordered by queue position', async () => {
      const mockRows = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          middle_name: null,
          full_name: 'John Doe',
          queue_position: 1,
          tenure_start_date: new Date('2024-01-01'),
          last_payment_date: new Date('2024-11-01'),
          total_successful_payments: 12,
          lifetime_payment_total: '360.00',
          subscription_status: 'active',
          subscription_id: 'sub-1'
        },
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          middle_name: null,
          full_name: 'Jane Smith',
          queue_position: 2,
          tenure_start_date: new Date('2024-02-01'),
          last_payment_date: new Date('2024-11-01'),
          total_successful_payments: 10,
          lifetime_payment_total: '300.00',
          subscription_status: 'active',
          subscription_id: 'sub-2'
        }
      ]

      vi.mocked(db.execute).mockResolvedValue({ rows: mockRows } as any)

      const winners = await winnerSelector.getEligibleMembers(2)

      expect(winners).toHaveLength(2)
      expect(winners[0].userId).toBe('user-1')
      expect(winners[0].queuePosition).toBe(1)
      expect(winners[0].email).toBe('user1@example.com')
      expect(winners[0].fullName).toBe('John Doe')
      expect(winners[1].userId).toBe('user-2')
      expect(winners[1].queuePosition).toBe(2)
    })

    it('should handle members with null full_name by constructing from first/last name', async () => {
      const mockRows = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          middle_name: null,
          full_name: null,
          queue_position: 1,
          tenure_start_date: new Date('2024-01-01'),
          last_payment_date: new Date('2024-11-01'),
          total_successful_payments: 12,
          lifetime_payment_total: '360.00',
          subscription_status: 'active',
          subscription_id: 'sub-1'
        }
      ]

      vi.mocked(db.execute).mockResolvedValue({ rows: mockRows } as any)

      const winners = await winnerSelector.getEligibleMembers(1)

      expect(winners).toHaveLength(1)
      expect(winners[0].fullName).toBe('John Doe')
    })

    it('should return empty array when no eligible members found', async () => {
      vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any)

      const winners = await winnerSelector.getEligibleMembers(5)

      expect(winners).toHaveLength(0)
    })

    it('should limit results to requested count', async () => {
      const mockRows = Array.from({ length: 10 }, (_, i) => ({
        user_id: `user-${i + 1}`,
        email: `user${i + 1}@example.com`,
        first_name: `User`,
        last_name: `${i + 1}`,
        middle_name: null,
        full_name: `User ${i + 1}`,
        queue_position: i + 1,
        tenure_start_date: new Date('2024-01-01'),
        last_payment_date: new Date('2024-11-01'),
        total_successful_payments: 12,
        lifetime_payment_total: '360.00',
        subscription_status: 'active',
        subscription_id: `sub-${i + 1}`
      }))

      vi.mocked(db.execute).mockResolvedValue({ rows: mockRows.slice(0, 3) } as any)

      const winners = await winnerSelector.getEligibleMembers(3)

      expect(winners).toHaveLength(3)
      expect(winners[0].queuePosition).toBe(1)
      expect(winners[2].queuePosition).toBe(3)
    })

    it('should throw error when database query fails', async () => {
      vi.mocked(db.execute).mockRejectedValue(new Error('Database error'))

      await expect(winnerSelector.getEligibleMembers(2)).rejects.toThrow(
        'Failed to select eligible members'
      )
    })
  })

  describe('validateWinner', () => {
    it('should return valid result when KYC verified and subscription active', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn()

      // Mock KYC verification check
      mockLimit.mockResolvedValueOnce([
        {
          status: 'verified',
          verifiedAt: new Date('2024-01-15')
        }
      ])

      // Mock subscription check
      mockLimit.mockResolvedValueOnce([
        {
          status: 'active',
          subscriptionId: 'sub-123'
        }
      ])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockWhere.mockReturnValue({
        limit: mockLimit
      } as any)

      const result = await winnerSelector.validateWinner('user-1')

      expect(result.isValid).toBe(true)
      expect(result.kycVerified).toBe(true)
      expect(result.hasActiveSubscription).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return invalid result when KYC not verified', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn()

      // Mock KYC verification check - pending status
      mockLimit.mockResolvedValueOnce([
        {
          status: 'pending',
          verifiedAt: null
        }
      ])

      // Mock subscription check - active
      mockLimit.mockResolvedValueOnce([
        {
          status: 'active',
          subscriptionId: 'sub-123'
        }
      ])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockWhere.mockReturnValue({
        limit: mockLimit
      } as any)

      const result = await winnerSelector.validateWinner('user-1')

      expect(result.isValid).toBe(false)
      expect(result.kycVerified).toBe(false)
      expect(result.hasActiveSubscription).toBe(true)
      expect(result.errors).toContain("KYC verification status is 'pending', must be 'verified'")
    })

    it('should return invalid result when subscription not active', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn()

      // Mock KYC verification check - verified
      mockLimit.mockResolvedValueOnce([
        {
          status: 'verified',
          verifiedAt: new Date('2024-01-15')
        }
      ])

      // Mock subscription check - canceled
      mockLimit.mockResolvedValueOnce([
        {
          status: 'canceled',
          subscriptionId: 'sub-123'
        }
      ])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockWhere.mockReturnValue({
        limit: mockLimit
      } as any)

      const result = await winnerSelector.validateWinner('user-1')

      expect(result.isValid).toBe(false)
      expect(result.kycVerified).toBe(true)
      expect(result.hasActiveSubscription).toBe(false)
      expect(result.errors).toContain("Subscription status is 'canceled', must be 'active' or 'trialing'")
    })

    it('should return invalid result when no KYC record found', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn()

      // Mock KYC verification check - no record
      mockLimit.mockResolvedValueOnce([])

      // Mock subscription check - active
      mockLimit.mockResolvedValueOnce([
        {
          status: 'active',
          subscriptionId: 'sub-123'
        }
      ])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockWhere.mockReturnValue({
        limit: mockLimit
      } as any)

      const result = await winnerSelector.validateWinner('user-1')

      expect(result.isValid).toBe(false)
      expect(result.kycVerified).toBe(false)
      expect(result.errors).toContain('No KYC verification record found')
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await winnerSelector.validateWinner('user-1')

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      // The error messages will be about failed checks, not system error
      expect(result.kycVerified).toBe(false)
      expect(result.hasActiveSubscription).toBe(false)
    })
  })

  describe('createPayoutRecords', () => {
    const mockWinners: Winner[] = [
      {
        userId: 'user-1',
        email: 'user1@example.com',
        fullName: 'John Doe',
        queuePosition: 1,
        tenureStartDate: new Date('2024-01-01'),
        lastPaymentDate: new Date('2024-11-01'),
        totalPayments: 12,
        lifetimeTotal: 360,
        subscriptionStatus: 'active',
        subscriptionId: 'sub-1'
      }
    ]

    it('should create payout records for valid winners', async () => {
      // Mock validation
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn()

      // Mock KYC and subscription checks to return valid
      mockLimit
        .mockResolvedValueOnce([{ status: 'verified', verifiedAt: new Date() }])
        .mockResolvedValueOnce([{ status: 'active', subscriptionId: 'sub-1' }])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockWhere.mockReturnValue({
        limit: mockLimit
      } as any)

      // Mock transaction
      const mockInsert = vi.fn().mockReturnThis()
      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: 1,
          payoutId: 'payout-123'
        }
      ])

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        const tx = {
          insert: mockInsert,
          values: mockValues,
          returning: mockReturning
        }
        mockInsert.mockReturnValue({
          values: mockValues
        })
        mockValues.mockReturnValue({
          returning: mockReturning
        })
        return await callback(tx)
      })

      const result = await winnerSelector.createPayoutRecords(mockWinners, 1, 'Test payout')

      expect(result.success).toBe(true)
      expect(result.createdCount).toBe(1)
      expect(result.failedCount).toBe(0)
      expect(result.payoutIds).toHaveLength(1)
    })

    it('should skip invalid winners and report failures', async () => {
      // Mock validation to return invalid
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn()

      // Mock KYC check to return pending (invalid)
      mockLimit
        .mockResolvedValueOnce([{ status: 'pending', verifiedAt: null }])
        .mockResolvedValueOnce([{ status: 'active', subscriptionId: 'sub-1' }])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockWhere.mockReturnValue({
        limit: mockLimit
      } as any)

      // Mock transaction
      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback({})
      })

      const result = await winnerSelector.createPayoutRecords(mockWinners, 1)

      expect(result.success).toBe(false)
      expect(result.createdCount).toBe(0)
      expect(result.failedCount).toBe(1)
      expect(result.failedUsers).toHaveLength(1)
      expect(result.failedUsers[0].userId).toBe('user-1')
    })

    it('should use transaction for atomicity', async () => {
      const transactionCallback = vi.fn()
      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        transactionCallback()
        return await callback({
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([])
        })
      })

      // Mock validation to fail so no inserts happen
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        limit: mockLimit
      } as any)

      mockWhere.mockReturnValue({
        limit: mockLimit
      } as any)

      await winnerSelector.createPayoutRecords(mockWinners, 1)

      expect(transactionCallback).toHaveBeenCalled()
    })

    it('should throw error when transaction fails', async () => {
      vi.mocked(db.transaction).mockRejectedValue(new Error('Transaction failed'))

      await expect(
        winnerSelector.createPayoutRecords(mockWinners, 1)
      ).rejects.toThrow('Failed to create payout records')
    })
  })
})
