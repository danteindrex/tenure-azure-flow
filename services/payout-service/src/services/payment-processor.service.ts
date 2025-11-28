/**
 * Payment Processor Service
 * 
 * Handles physical payment processing, payout calculations, payment instructions,
 * status tracking, and receipt generation for member payouts.
 * 
 * Business Rules:
 * - Gross payout amount: $100,000
 * - Retention fee: $300 (deducted for next year's membership)
 * - Tax withholding: 24% if no valid W-9 on file
 * - Net payout: Gross - Retention Fee - Tax Withholding
 * 
 * Requirements: 7.1-7.10
 */

import { db } from '../config/database'
import { payoutManagement, userAddresses, userMemberships } from '../../drizzle/schema'
import { eq, and, sql } from 'drizzle-orm'
import { logger } from '../utils/logger'
import {
  PayoutCalculation,
  PayoutBreakdownItem,
  PaymentInstructions,
  PaymentSentDetails,
  CompletionDetails,
  PaymentError,
  ReceiptData,
  RecipientDetails,
  BankDetails,
  Address
} from '../types/payment.types'
import { generatePaymentInstructionsPDF, generateReceiptPDF } from '../utils/pdf-generator'
import { uploadPDF } from '../utils/storage'
import { decryptBankDetails } from '../utils/encryption'

/**
 * Payment Processor Service Class
 * 
 * Provides methods for calculating payouts, generating payment instructions,
 * tracking payment status, and generating receipts.
 */
export class PaymentProcessorService {
  // Business constants
  private readonly GROSS_PAYOUT_AMOUNT = 100000.00
  private readonly RETENTION_FEE = 300.00
  private readonly TAX_WITHHOLDING_RATE = 0.24 // 24% backup withholding
  private readonly CURRENCY = 'USD'

  /**
   * Calculate net payout amount with retention fee and tax withholding
   * 
   * Requirement 7.1: Deduct $300 retention fee from $100,000 gross amount
   * Requirement 7.5: Calculate tax withholding if no W-9 (24%)
   * 
   * Formula:
   * - Gross Amount: $100,000
   * - Retention Fee: -$300
   * - Tax Withholding (if no W-9): -$24,000 (24% of gross)
   * - Net Amount: $99,700 (with W-9) or $75,700 (without W-9)
   * 
   * @param hasValidW9 - Whether the member has a valid W-9 on file
   * @returns Promise<PayoutCalculation> - Detailed payout calculation with breakdown
   */
  async calculateNetPayout(hasValidW9: boolean): Promise<PayoutCalculation> {
    try {
      logger.info('Calculating net payout', {
        grossAmount: this.GROSS_PAYOUT_AMOUNT,
        retentionFee: this.RETENTION_FEE,
        hasValidW9
      })

      const grossAmount = this.GROSS_PAYOUT_AMOUNT
      const retentionFee = this.RETENTION_FEE

      // Calculate tax withholding if no W-9
      const taxWithholding = hasValidW9 
        ? 0 
        : Math.round(grossAmount * this.TAX_WITHHOLDING_RATE * 100) / 100

      // Calculate net amount
      const netAmount = grossAmount - retentionFee - taxWithholding

      // Build breakdown
      const breakdown: PayoutBreakdownItem[] = [
        {
          description: 'Gross Payout',
          amount: grossAmount,
          type: 'credit'
        },
        {
          description: 'Retention Fee (Next Year Membership)',
          amount: -retentionFee,
          type: 'debit'
        }
      ]

      // Add tax withholding to breakdown if applicable
      if (!hasValidW9) {
        breakdown.push({
          description: 'Federal Tax Withholding (24% - No W-9)',
          amount: -taxWithholding,
          type: 'debit'
        })
      }

      breakdown.push({
        description: 'Net Payout Amount',
        amount: netAmount,
        type: 'credit'
      })

      const calculation: PayoutCalculation = {
        grossAmount,
        retentionFee,
        taxWithholding,
        netAmount,
        breakdown
      }

      logger.info('Net payout calculated', {
        grossAmount,
        retentionFee,
        taxWithholding,
        netAmount,
        hasValidW9
      })

      return calculation
    } catch (error) {
      logger.error('Failed to calculate net payout', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        hasValidW9
      })
      throw new Error('Failed to calculate net payout')
    }
  }

  /**
   * Store payout calculation in payout_management record
   * 
   * Stores the breakdown in the processing JSONB field for audit trail.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param calculation - The payout calculation to store
   * @returns Promise<void>
   */
  async storePayoutCalculation(
    payoutId: string,
    calculation: PayoutCalculation
  ): Promise<void> {
    try {
      logger.info('Storing payout calculation', { payoutId })

      // Fetch current payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Get existing processing data or initialize
      const processing = (payout.processing as any) || {}

      // Store calculation details
      processing.calculation = {
        grossAmount: calculation.grossAmount,
        retentionFee: calculation.retentionFee,
        taxWithholding: calculation.taxWithholding,
        netAmount: calculation.netAmount,
        breakdown: calculation.breakdown,
        calculatedAt: new Date().toISOString()
      }

      // Update payout record
      await db
        .update(payoutManagement)
        .set({
          processing: processing as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      logger.info('Payout calculation stored', {
        payoutId,
        netAmount: calculation.netAmount
      })
    } catch (error) {
      logger.error('Failed to store payout calculation', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Calculate and store payout for a specific payout record
   * 
   * This is a convenience method that combines calculation and storage.
   * It checks if the member has a valid W-9 and calculates accordingly.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param hasValidW9 - Whether the member has a valid W-9 on file
   * @returns Promise<PayoutCalculation> - The calculated payout
   */
  async calculateAndStorePayoutForRecord(
    payoutId: string,
    hasValidW9: boolean
  ): Promise<PayoutCalculation> {
    try {
      logger.info('Calculating and storing payout', { payoutId, hasValidW9 })

      // Calculate net payout
      const calculation = await this.calculateNetPayout(hasValidW9)

      // Store in database
      await this.storePayoutCalculation(payoutId, calculation)

      // Update audit trail
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (payout) {
        const auditTrail = (payout.auditTrail as any[]) || []
        auditTrail.push({
          action: 'payout_calculated',
          actor: 'system',
          timestamp: new Date().toISOString(),
          details: {
            grossAmount: calculation.grossAmount,
            retentionFee: calculation.retentionFee,
            taxWithholding: calculation.taxWithholding,
            netAmount: calculation.netAmount,
            hasValidW9
          }
        })

        await db
          .update(payoutManagement)
          .set({
            auditTrail: auditTrail as any,
            updatedAt: new Date()
          })
          .where(eq(payoutManagement.payoutId, payoutId))
      }

      logger.info('Payout calculated and stored successfully', {
        payoutId,
        netAmount: calculation.netAmount
      })

      return calculation
    } catch (error) {
      logger.error('Failed to calculate and store payout', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Generate payment instructions for finance team
   * 
   * Requirement 7.2: For ACH, retrieve encrypted bank details from bank_details JSONB
   * Requirement 7.3: For check, query user_addresses table WHERE is_primary = true
   * Requirement 7.4: Generate PDF using PDFKit with payment details and net amount
   * 
   * Creates a PDF document with payment instructions that the finance team
   * can use to process the payment manually.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param generatedBy - Admin ID who generated the instructions
   * @returns Promise<PaymentInstructions> - Payment instructions with PDF URL
   */
  async generatePaymentInstructions(
    payoutId: string,
    generatedBy: number
  ): Promise<PaymentInstructions> {
    try {
      logger.info('Generating payment instructions', { payoutId, generatedBy })

      // Fetch payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId),
        with: {
          user: true
        }
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Verify payout is approved
      if (payout.status !== 'approved') {
        throw new Error(`Payout must be approved before generating instructions. Current status: ${payout.status}`)
      }

      // Get calculation from processing field
      const processing = (payout.processing as any) || {}
      const calculation = processing.calculation

      if (!calculation) {
        throw new Error('Payout calculation not found. Please calculate payout first.')
      }

      // Get recipient details
      const user = payout.user as any
      const recipient: RecipientDetails = {
        userId: payout.userId,
        fullName: user?.name || 'Unknown',
        email: user?.email || 'unknown@example.com'
      }

      // Determine payment method
      const paymentMethod = payout.paymentMethod as 'ach' | 'check'

      let bankDetails: BankDetails | undefined
      let mailingAddress: Address | undefined

      // For ACH: retrieve bank details from bank_details JSONB
      if (paymentMethod === 'ach') {
        const storedBankDetails = payout.bankDetails as any

        if (!storedBankDetails) {
          throw new Error('Bank details not found for ACH payment')
        }

        // Decrypt bank details if encrypted
        if (storedBankDetails.encrypted) {
          const decrypted = decryptBankDetails(storedBankDetails)
          bankDetails = {
            accountHolderName: decrypted.accountHolderName || recipient.fullName,
            routingNumber: decrypted.routingNumber,
            accountNumber: decrypted.accountNumber,
            accountType: decrypted.accountType || 'checking',
            bankName: decrypted.bankName,
            encrypted: false
          }
        } else {
          bankDetails = {
            accountHolderName: storedBankDetails.accountHolderName || recipient.fullName,
            routingNumber: storedBankDetails.routingNumber,
            accountNumber: storedBankDetails.accountNumber,
            accountType: storedBankDetails.accountType || 'checking',
            bankName: storedBankDetails.bankName,
            encrypted: false
          }
        }

        logger.debug('Retrieved bank details for ACH payment', {
          payoutId,
          accountType: bankDetails.accountType,
          hasRoutingNumber: !!bankDetails.routingNumber,
          hasAccountNumber: !!bankDetails.accountNumber
        })
      }
      // For check: query user_addresses table WHERE is_primary = true
      else if (paymentMethod === 'check') {
        const addresses = await db
          .select()
          .from(userAddresses)
          .where(
            and(
              eq(userAddresses.userId, payout.userId),
              eq(userAddresses.isPrimary, true)
            )
          )
          .limit(1)

        if (addresses.length === 0) {
          throw new Error('Primary address not found for check payment')
        }

        const address = addresses[0]
        mailingAddress = {
          streetAddress: address.streetAddress,
          addressLine2: address.addressLine2 || undefined,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          countryCode: address.countryCode || 'US'
        }

        logger.debug('Retrieved mailing address for check payment', {
          payoutId,
          city: mailingAddress.city,
          state: mailingAddress.state
        })
      } else {
        throw new Error(`Invalid payment method: ${paymentMethod}`)
      }

      // Generate PDF instructions
      const pdfBuffer = await generatePaymentInstructionsPDF({
        payoutId,
        recipientName: recipient.fullName,
        recipientEmail: recipient.email,
        netAmount: calculation.netAmount,
        paymentMethod,
        bankDetails: bankDetails ? {
          accountHolderName: bankDetails.accountHolderName,
          routingNumber: bankDetails.routingNumber,
          accountNumber: bankDetails.accountNumber,
          accountType: bankDetails.accountType,
          bankName: bankDetails.bankName,
        } : undefined,
        mailingAddress: mailingAddress ? {
          streetAddress: mailingAddress.streetAddress,
          city: mailingAddress.city,
          state: mailingAddress.state,
          postalCode: mailingAddress.postalCode,
        } : undefined,
        breakdown: calculation.breakdown.map(item => ({
          description: item.description,
          amount: item.amount,
        })),
        generatedAt: new Date(),
      })

      // Upload PDF to storage
      const pdfUrl = await uploadPDF(pdfBuffer, 'instructions', `${payoutId}-instructions.pdf`)

      // Store PDF URL in processing field
      processing.instructionsPdfUrl = pdfUrl
      processing.instructionsGeneratedAt = new Date().toISOString()
      processing.instructionsGeneratedBy = generatedBy

      await db
        .update(payoutManagement)
        .set({
          processing: processing as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      // Update audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: 'payment_instructions_generated',
        actor: `admin_${generatedBy}`,
        timestamp: new Date().toISOString(),
        details: {
          paymentMethod,
          netAmount: calculation.netAmount,
          pdfUrl
        }
      })

      await db
        .update(payoutManagement)
        .set({
          auditTrail: auditTrail as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      const instructions: PaymentInstructions = {
        payoutId,
        paymentMethod,
        amount: calculation.netAmount,
        currency: this.CURRENCY,
        recipient,
        bankDetails,
        mailingAddress,
        instructionsPdfUrl: pdfUrl,
        generatedAt: new Date(),
        generatedBy
      }

      logger.info('Payment instructions generated successfully', {
        payoutId,
        paymentMethod,
        netAmount: calculation.netAmount,
        pdfUrl
      })

      return instructions
    } catch (error) {
      logger.error('Failed to generate payment instructions', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }


  /**
   * Mark payment as sent
   * 
   * Requirement 7.6: Update status to 'processing'
   * Requirement 7.7: Store sent date and expected arrival date in processing JSONB
   * 
   * Called by finance team after they have initiated the payment.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param details - Payment sent details
   * @returns Promise<void>
   */
  async markPaymentSent(
    payoutId: string,
    details: PaymentSentDetails
  ): Promise<void> {
    try {
      logger.info('Marking payment as sent', {
        payoutId,
        sentDate: details.sentDate,
        expectedArrivalDate: details.expectedArrivalDate
      })

      // Fetch payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Verify payout is in correct status
      if (payout.status !== 'approved' && payout.status !== 'scheduled') {
        throw new Error(
          `Cannot mark payment as sent. Current status: ${payout.status}. ` +
          `Expected: approved or ready_for_payment`
        )
      }

      // Get existing processing data
      const processing = (payout.processing as any) || {}

      // Store payment sent details
      processing.sentDate = details.sentDate.toISOString()
      processing.expectedArrivalDate = details.expectedArrivalDate.toISOString()
      processing.trackingNumber = details.trackingNumber
      processing.sentNotes = details.notes
      processing.sentBy = details.sentBy

      // Update payout record
      await db
        .update(payoutManagement)
        .set({
          status: 'processing',
          scheduledDate: details.expectedArrivalDate,
          processing: processing as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      // Update audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: 'processing',
        actor: `admin_${details.sentBy}`,
        timestamp: new Date().toISOString(),
        details: {
          sentDate: details.sentDate.toISOString(),
          expectedArrivalDate: details.expectedArrivalDate.toISOString(),
          trackingNumber: details.trackingNumber,
          notes: details.notes
        }
      })

      await db
        .update(payoutManagement)
        .set({
          auditTrail: auditTrail as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      logger.info('Payment marked as sent successfully', {
        payoutId,
        sentDate: details.sentDate,
        expectedArrivalDate: details.expectedArrivalDate
      })
    } catch (error) {
      logger.error('Failed to mark payment as sent', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Confirm payment completion
   * 
   * Requirement 7.8: Update status to 'completed'
   * Requirement 7.9: Store completion timestamp
   * 
   * Called by finance team after payment has been confirmed/cleared.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param details - Completion details
   * @returns Promise<void>
   */
  async confirmPaymentComplete(
    payoutId: string,
    details: CompletionDetails
  ): Promise<void> {
    try {
      logger.info('Confirming payment completion', {
        payoutId,
        completedDate: details.completedDate
      })

      // Fetch payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Verify payout is in correct status
      if (payout.status !== 'processing') {
        throw new Error(
          `Cannot confirm payment completion. Current status: ${payout.status}. ` +
          `Expected: payment_sent`
        )
      }

      // Get existing processing data
      const processing = (payout.processing as any) || {}

      // Store completion details
      processing.completedDate = details.completedDate.toISOString()
      processing.confirmationNumber = details.confirmationNumber
      processing.completionNotes = details.notes
      processing.completedBy = details.completedBy

      // Update payout record
      await db
        .update(payoutManagement)
        .set({
          status: 'completed',
          receiptUrl: details.receiptUrl,
          processing: processing as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      // SYNC: Update member_status to 'Paid' when payout completes
      // This marks the user as having received their prize
      await db
        .update(userMemberships)
        .set({
          memberStatus: 'Paid',
          updatedAt: new Date()
        })
        .where(eq(userMemberships.userId, payout.userId))

      logger.info(`Member status set to Paid for user ${payout.userId}`)

      // Update audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: 'payment_completed',
        actor: `admin_${details.completedBy}`,
        timestamp: new Date().toISOString(),
        details: {
          completedDate: details.completedDate.toISOString(),
          confirmationNumber: details.confirmationNumber,
          receiptUrl: details.receiptUrl,
          notes: details.notes,
          memberStatusUpdated: 'Paid'
        }
      })

      await db
        .update(payoutManagement)
        .set({
          auditTrail: auditTrail as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      logger.info('Payment completion confirmed successfully', {
        payoutId,
        completedDate: details.completedDate,
        receiptUrl: details.receiptUrl
      })
    } catch (error) {
      logger.error('Failed to confirm payment completion', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Handle payment failure
   * 
   * Requirement 7.9: Update status to 'payment_failed' and log error
   * 
   * Called when a payment fails or is returned.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param error - Payment error details
   * @returns Promise<void>
   */
  async handlePaymentFailure(
    payoutId: string,
    error: PaymentError
  ): Promise<void> {
    try {
      logger.error('Handling payment failure', {
        payoutId,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage
      })

      // Fetch payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Get existing processing data
      const processing = (payout.processing as any) || {}

      // Store failure details
      processing.failureTimestamp = error.timestamp.toISOString()
      processing.failureErrorCode = error.errorCode
      processing.failureErrorMessage = error.errorMessage
      processing.failureRetryable = error.retryable
      processing.failureDetails = error.details

      // Update payout record
      await db
        .update(payoutManagement)
        .set({
          status: 'payment_failed',
          processing: processing as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      // Update audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: 'payment_failed',
        actor: 'system',
        timestamp: new Date().toISOString(),
        details: {
          errorCode: error.errorCode,
          errorMessage: error.errorMessage,
          retryable: error.retryable,
          failureDetails: error.details
        }
      })

      await db
        .update(payoutManagement)
        .set({
          auditTrail: auditTrail as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      logger.info('Payment failure recorded', {
        payoutId,
        errorCode: error.errorCode,
        retryable: error.retryable
      })

      // TODO: Send notification to administrators about the failure
    } catch (err) {
      logger.error('Failed to handle payment failure', {
        payoutId,
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      })
      throw err
    }
  }

  /**
   * Generate receipt PDF for completed payout
   * 
   * Requirement 7.8: Generate receipt PDF showing retention fee deduction
   * Requirement 7.10: Include gross amount, retention fee, tax withholding, net amount
   * 
   * Creates a detailed receipt showing the complete payout breakdown.
   * 
   * @param payoutId - Unique identifier for the payout
   * @returns Promise<string> - URL to the generated receipt PDF
   */
  async generateReceipt(payoutId: string): Promise<string> {
    try {
      logger.info('Generating receipt', { payoutId })

      // Fetch payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId),
        with: {
          user: true
        }
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Verify payout is completed
      if (payout.status !== 'completed') {
        throw new Error(
          `Cannot generate receipt for incomplete payout. Current status: ${payout.status}`
        )
      }

      // Get calculation from processing field
      const processing = (payout.processing as any) || {}
      const calculation = processing.calculation

      if (!calculation) {
        throw new Error('Payout calculation not found')
      }

      // Get payment date
      const paymentDate = processing.completedDate 
        ? new Date(processing.completedDate)
        : new Date()

      // Prepare receipt data
      const user = payout.user as any
      const receiptData: ReceiptData = {
        payoutId,
        userId: payout.userId,
        recipientName: user?.name || 'Unknown',
        grossAmount: calculation.grossAmount,
        retentionFee: calculation.retentionFee,
        taxWithholding: calculation.taxWithholding,
        netAmount: calculation.netAmount,
        paymentMethod: payout.paymentMethod as 'ach' | 'check',
        paymentDate,
        breakdown: calculation.breakdown
      }

      // Generate receipt PDF
      const receiptBuffer = await generateReceiptPDF({
        payoutId: receiptData.payoutId,
        recipientName: receiptData.recipientName,
        recipientEmail: user?.email || 'unknown@example.com',
        grossAmount: receiptData.grossAmount,
        retentionFee: receiptData.retentionFee,
        taxWithholding: receiptData.taxWithholding,
        netAmount: receiptData.netAmount,
        paymentMethod: receiptData.paymentMethod,
        paymentDate: receiptData.paymentDate,
        breakdown: receiptData.breakdown.map(item => ({
          description: item.description,
          amount: item.amount,
        })),
      })

      // Upload PDF to storage
      const receiptUrl = await uploadPDF(receiptBuffer, 'receipts', `${payoutId}-receipt.pdf`)

      // Store receipt URL in payout record
      await db
        .update(payoutManagement)
        .set({
          receiptUrl,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      // Update audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: 'receipt_generated',
        actor: 'system',
        timestamp: new Date().toISOString(),
        details: {
          receiptUrl,
          netAmount: calculation.netAmount
        }
      })

      await db
        .update(payoutManagement)
        .set({
          auditTrail: auditTrail as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      logger.info('Receipt generated successfully', {
        payoutId,
        receiptUrl
      })

      return receiptUrl
    } catch (error) {
      logger.error('Failed to generate receipt', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }


  /**
   * Get payout status
   * 
   * Retrieves the current status of a payout with all relevant details.
   * 
   * @param payoutId - Unique identifier for the payout
   * @returns Promise<any> - Payout status details
   */
  async getPayoutStatus(payoutId: string): Promise<any> {
    try {
      logger.debug('Getting payout status', { payoutId })

      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId),
        with: {
          user: true
        }
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      const processing = (payout.processing as any) || {}

      return {
        payoutId: payout.payoutId,
        userId: payout.userId,
        status: payout.status,
        amount: parseFloat(payout.amount),
        currency: payout.currency,
        paymentMethod: payout.paymentMethod,
        calculation: processing.calculation,
        sentDate: processing.sentDate,
        expectedArrivalDate: processing.expectedArrivalDate,
        completedDate: processing.completedDate,
        receiptUrl: payout.receiptUrl,
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt
      }
    } catch (error) {
      logger.error('Failed to get payout status', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// Export singleton instance
export const paymentProcessorService = new PaymentProcessorService()

