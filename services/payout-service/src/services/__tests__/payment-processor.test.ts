/**
 * Payment Processor Service Tests
 * 
 * Tests for payout calculation, payment instructions, status tracking, and receipt generation
 */

import { describe, it, expect } from 'vitest'
import { PaymentProcessorService } from '../payment-processor.service'

describe('PaymentProcessorService', () => {
  const service = new PaymentProcessorService()

  describe('calculateNetPayout', () => {
    it('should calculate correct net payout with valid W-9', async () => {
      const calculation = await service.calculateNetPayout(true)

      expect(calculation.grossAmount).toBe(100000.00)
      expect(calculation.retentionFee).toBe(300.00)
      expect(calculation.taxWithholding).toBe(0)
      expect(calculation.netAmount).toBe(99700.00)
      expect(calculation.breakdown).toHaveLength(3)
    })

    it('should calculate correct net payout without W-9 (with tax withholding)', async () => {
      const calculation = await service.calculateNetPayout(false)

      expect(calculation.grossAmount).toBe(100000.00)
      expect(calculation.retentionFee).toBe(300.00)
      expect(calculation.taxWithholding).toBe(24000.00) // 24% of gross
      expect(calculation.netAmount).toBe(75700.00) // 100000 - 300 - 24000
      expect(calculation.breakdown).toHaveLength(4)
    })

    it('should include retention fee in breakdown', async () => {
      const calculation = await service.calculateNetPayout(true)

      const retentionFeeItem = calculation.breakdown.find(
        item => item.description.includes('Retention Fee')
      )

      expect(retentionFeeItem).toBeDefined()
      expect(retentionFeeItem?.amount).toBe(-300.00)
      expect(retentionFeeItem?.type).toBe('debit')
    })

    it('should include tax withholding in breakdown when no W-9', async () => {
      const calculation = await service.calculateNetPayout(false)

      const taxItem = calculation.breakdown.find(
        item => item.description.includes('Tax Withholding')
      )

      expect(taxItem).toBeDefined()
      expect(taxItem?.amount).toBe(-24000.00)
      expect(taxItem?.type).toBe('debit')
    })

    it('should not include tax withholding in breakdown when W-9 present', async () => {
      const calculation = await service.calculateNetPayout(true)

      const taxItem = calculation.breakdown.find(
        item => item.description.includes('Tax Withholding')
      )

      expect(taxItem).toBeUndefined()
    })

    it('should have correct breakdown structure', async () => {
      const calculation = await service.calculateNetPayout(true)

      expect(calculation.breakdown[0].description).toBe('Gross Payout')
      expect(calculation.breakdown[0].amount).toBe(100000.00)
      expect(calculation.breakdown[0].type).toBe('credit')

      expect(calculation.breakdown[1].description).toContain('Retention Fee')
      expect(calculation.breakdown[1].amount).toBe(-300.00)
      expect(calculation.breakdown[1].type).toBe('debit')

      expect(calculation.breakdown[2].description).toBe('Net Payout Amount')
      expect(calculation.breakdown[2].amount).toBe(99700.00)
      expect(calculation.breakdown[2].type).toBe('credit')
    })
  })

  describe('Business Rules', () => {
    it('should enforce $300 retention fee', async () => {
      const calculation = await service.calculateNetPayout(true)
      expect(calculation.retentionFee).toBe(300.00)
    })

    it('should enforce 24% tax withholding rate when no W-9', async () => {
      const calculation = await service.calculateNetPayout(false)
      const expectedWithholding = 100000 * 0.24
      expect(calculation.taxWithholding).toBe(expectedWithholding)
    })

    it('should enforce $100,000 gross payout amount', async () => {
      const calculation = await service.calculateNetPayout(true)
      expect(calculation.grossAmount).toBe(100000.00)
    })
  })
})

