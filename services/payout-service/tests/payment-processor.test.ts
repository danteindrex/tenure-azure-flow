/**
 * Payment Processor Service Tests
 * 
 * Tests for payout calculation logic (Task 7.1)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PaymentProcessorService } from '../src/services/payment-processor.service'

describe('PaymentProcessorService - Task 7.1: Payout Calculation', () => {
  let service: PaymentProcessorService

  beforeEach(() => {
    service = new PaymentProcessorService()
  })

  describe('calculateNetPayout', () => {
    it('should calculate net payout with W-9 (no tax withholding)', async () => {
      // Arrange
      const hasValidW9 = true

      // Act
      const result = await service.calculateNetPayout(hasValidW9)

      // Assert
      expect(result.grossAmount).toBe(100000.00)
      expect(result.retentionFee).toBe(300.00)
      expect(result.taxWithholding).toBe(0)
      expect(result.netAmount).toBe(99700.00)
      expect(result.breakdown).toHaveLength(3) // Gross, Retention Fee, Net
    })

    it('should calculate net payout without W-9 (24% tax withholding)', async () => {
      // Arrange
      const hasValidW9 = false

      // Act
      const result = await service.calculateNetPayout(hasValidW9)

      // Assert
      expect(result.grossAmount).toBe(100000.00)
      expect(result.retentionFee).toBe(300.00)
      expect(result.taxWithholding).toBe(24000.00) // 24% of $100,000
      expect(result.netAmount).toBe(75700.00) // $100,000 - $300 - $24,000
      expect(result.breakdown).toHaveLength(4) // Gross, Retention Fee, Tax Withholding, Net
    })

    it('should deduct $300 retention fee from gross amount', async () => {
      // Arrange
      const hasValidW9 = true

      // Act
      const result = await service.calculateNetPayout(hasValidW9)

      // Assert - Requirement 7.1
      expect(result.retentionFee).toBe(300.00)
      expect(result.netAmount).toBe(result.grossAmount - result.retentionFee)
    })

    it('should calculate 24% tax withholding when no W-9', async () => {
      // Arrange
      const hasValidW9 = false

      // Act
      const result = await service.calculateNetPayout(hasValidW9)

      // Assert - Requirement 7.5
      expect(result.taxWithholding).toBe(24000.00)
      expect(result.taxWithholding).toBe(result.grossAmount * 0.24)
    })

    it('should return PayoutCalculation with breakdown', async () => {
      // Arrange
      const hasValidW9 = true

      // Act
      const result = await service.calculateNetPayout(hasValidW9)

      // Assert - Requirement 7.1
      expect(result).toHaveProperty('grossAmount')
      expect(result).toHaveProperty('retentionFee')
      expect(result).toHaveProperty('taxWithholding')
      expect(result).toHaveProperty('netAmount')
      expect(result).toHaveProperty('breakdown')
      expect(Array.isArray(result.breakdown)).toBe(true)
    })

    it('should include correct breakdown items with W-9', async () => {
      // Arrange
      const hasValidW9 = true

      // Act
      const result = await service.calculateNetPayout(hasValidW9)

      // Assert
      expect(result.breakdown[0].description).toBe('Gross Payout')
      expect(result.breakdown[0].amount).toBe(100000.00)
      expect(result.breakdown[0].type).toBe('credit')

      expect(result.breakdown[1].description).toBe('Retention Fee (Next Year Membership)')
      expect(result.breakdown[1].amount).toBe(-300.00)
      expect(result.breakdown[1].type).toBe('debit')

      expect(result.breakdown[2].description).toBe('Net Payout Amount')
      expect(result.breakdown[2].amount).toBe(99700.00)
      expect(result.breakdown[2].type).toBe('credit')
    })

    it('should include tax withholding in breakdown when no W-9', async () => {
      // Arrange
      const hasValidW9 = false

      // Act
      const result = await service.calculateNetPayout(hasValidW9)

      // Assert
      expect(result.breakdown[0].description).toBe('Gross Payout')
      expect(result.breakdown[0].amount).toBe(100000.00)

      expect(result.breakdown[1].description).toBe('Retention Fee (Next Year Membership)')
      expect(result.breakdown[1].amount).toBe(-300.00)

      expect(result.breakdown[2].description).toBe('Federal Tax Withholding (24% - No W-9)')
      expect(result.breakdown[2].amount).toBe(-24000.00)
      expect(result.breakdown[2].type).toBe('debit')

      expect(result.breakdown[3].description).toBe('Net Payout Amount')
      expect(result.breakdown[3].amount).toBe(75700.00)
    })

    it('should calculate correct net amount formula', async () => {
      // Test with W-9
      const withW9 = await service.calculateNetPayout(true)
      expect(withW9.netAmount).toBe(
        withW9.grossAmount - withW9.retentionFee - withW9.taxWithholding
      )

      // Test without W-9
      const withoutW9 = await service.calculateNetPayout(false)
      expect(withoutW9.netAmount).toBe(
        withoutW9.grossAmount - withoutW9.retentionFee - withoutW9.taxWithholding
      )
    })
  })
})
