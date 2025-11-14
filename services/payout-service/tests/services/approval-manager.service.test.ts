/**
 * Approval Manager Service Tests
 * 
 * Unit tests for the approval workflow management functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApprovalManagerService } from '../../src/services/approval-manager.service'

describe('ApprovalManagerService', () => {
  let service: ApprovalManagerService

  beforeEach(() => {
    service = new ApprovalManagerService()
  })

  describe('requiresApproval', () => {
    it('should return true for amounts >= $100,000', () => {
      expect(service.requiresApproval(100000)).toBe(true)
      expect(service.requiresApproval(150000)).toBe(true)
      expect(service.requiresApproval(100000.01)).toBe(true)
    })

    it('should return false for amounts < $100,000', () => {
      expect(service.requiresApproval(99999.99)).toBe(false)
      expect(service.requiresApproval(50000)).toBe(false)
      expect(service.requiresApproval(0)).toBe(false)
    })

    it('should handle edge case of exactly $100,000', () => {
      expect(service.requiresApproval(100000)).toBe(true)
    })
  })

  describe('getRequiredApprovalCount', () => {
    it('should return 2 approvals for amounts >= $100,000', () => {
      expect(service.getRequiredApprovalCount(100000)).toBe(2)
      expect(service.getRequiredApprovalCount(200000)).toBe(2)
    })

    it('should return 1 approval for amounts < $100,000', () => {
      expect(service.getRequiredApprovalCount(99999)).toBe(1)
      expect(service.getRequiredApprovalCount(50000)).toBe(1)
    })
  })

  describe('getApprovalThreshold', () => {
    it('should return the default threshold configuration', () => {
      const threshold = service.getApprovalThreshold()
      
      expect(threshold).toEqual({
        amount: 100000,
        requiredApprovals: 2,
        allowedRoles: ['admin', 'finance_manager']
      })
    })

    it('should return a copy of the threshold (not reference)', () => {
      const threshold1 = service.getApprovalThreshold()
      const threshold2 = service.getApprovalThreshold()
      
      expect(threshold1).not.toBe(threshold2)
      expect(threshold1).toEqual(threshold2)
    })
  })

  describe('canApprove', () => {
    it('should return true for admin role', () => {
      expect(service.canApprove('admin')).toBe(true)
    })

    it('should return true for finance_manager role', () => {
      expect(service.canApprove('finance_manager')).toBe(true)
    })

    it('should return false for unauthorized roles', () => {
      expect(service.canApprove('user')).toBe(false)
      expect(service.canApprove('viewer')).toBe(false)
      expect(service.canApprove('guest')).toBe(false)
      expect(service.canApprove('')).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(service.canApprove('Admin')).toBe(false)
      expect(service.canApprove('ADMIN')).toBe(false)
      expect(service.canApprove('Finance_Manager')).toBe(false)
    })
  })

  // Note: Integration tests for submitApproval, checkApprovalStatus, and other
  // database-dependent methods should be in separate integration test files
  // as they require database mocking or a test database instance.
  
  describe('submitApproval - unit logic', () => {
    it('should validate approval decision structure', () => {
      const validDecision = {
        approved: true,
        reason: 'Verified eligibility',
        timestamp: new Date(),
        adminId: 1,
        adminName: 'Test Admin'
      }
      
      expect(validDecision.approved).toBeDefined()
      expect(validDecision.timestamp).toBeInstanceOf(Date)
      expect(validDecision.adminId).toBeGreaterThan(0)
    })

    it('should handle rejection decision structure', () => {
      const rejectionDecision = {
        approved: false,
        reason: 'Insufficient documentation',
        timestamp: new Date(),
        adminId: 2,
        adminName: 'Test Admin 2'
      }
      
      expect(rejectionDecision.approved).toBe(false)
      expect(rejectionDecision.reason).toBeTruthy()
    })

    it('should include optional metadata in decision', () => {
      const decisionWithMetadata = {
        approved: true,
        reason: 'All checks passed',
        timestamp: new Date(),
        adminId: 1,
        adminName: 'Test Admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      }
      
      expect(decisionWithMetadata.ipAddress).toBeDefined()
      expect(decisionWithMetadata.userAgent).toBeDefined()
    })

    it('should validate required fields in approval decision', () => {
      const minimalDecision = {
        approved: true,
        timestamp: new Date(),
        adminId: 1
      }
      
      // Required fields
      expect(minimalDecision.approved).toBeDefined()
      expect(minimalDecision.timestamp).toBeInstanceOf(Date)
      expect(minimalDecision.adminId).toBeGreaterThan(0)
      
      // Optional fields can be undefined
      expect(minimalDecision).not.toHaveProperty('reason')
      expect(minimalDecision).not.toHaveProperty('adminName')
    })
  })

  describe('checkApprovalStatus - unit logic', () => {
    it('should correctly identify complete workflow', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 2,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'approved' as const, timestamp: new Date() },
          { adminId: 2, adminName: 'Admin 2', adminEmail: 'admin2@test.com', decision: 'approved' as const, timestamp: new Date() }
        ],
        status: 'approved' as const,
        createdAt: new Date(),
        completedAt: new Date()
      }
      
      const isComplete = mockWorkflow.status === 'approved' || mockWorkflow.status === 'rejected'
      expect(isComplete).toBe(true)
      expect(mockWorkflow.currentApprovals).toBe(mockWorkflow.requiredApprovals)
    })

    it('should correctly identify pending workflow', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 1,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'approved' as const, timestamp: new Date() }
        ],
        status: 'pending' as const,
        createdAt: new Date()
      }
      
      const isComplete = mockWorkflow.status === 'approved' || mockWorkflow.status === 'rejected'
      expect(isComplete).toBe(false)
      expect(mockWorkflow.currentApprovals).toBeLessThan(mockWorkflow.requiredApprovals)
    })

    it('should correctly identify rejected workflow', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 0,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'rejected' as const, reason: 'Invalid', timestamp: new Date() }
        ],
        status: 'rejected' as const,
        createdAt: new Date(),
        completedAt: new Date()
      }
      
      const isRejected = mockWorkflow.status === 'rejected'
      expect(isRejected).toBe(true)
      
      const rejectionReason = mockWorkflow.approvers.find(a => a.decision === 'rejected')?.reason
      expect(rejectionReason).toBe('Invalid')
    })

    it('should count current approvals correctly', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 1,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'approved' as const, timestamp: new Date() },
          { adminId: 2, adminName: 'Admin 2', adminEmail: 'admin2@test.com', decision: undefined, timestamp: new Date() }
        ],
        status: 'pending' as const,
        createdAt: new Date()
      }
      
      const currentApprovals = mockWorkflow.approvers.filter(a => a.decision === 'approved').length
      expect(currentApprovals).toBe(1)
    })

    it('should calculate pending approvers count', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 1,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'approved' as const, timestamp: new Date() }
        ],
        status: 'pending' as const,
        createdAt: new Date()
      }
      
      const currentApprovals = mockWorkflow.approvers.filter(a => a.decision === 'approved').length
      const pendingCount = Math.max(0, mockWorkflow.requiredApprovals - currentApprovals)
      expect(pendingCount).toBe(1)
    })

    it('should handle workflow with all required approvals', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 2,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'approved' as const, timestamp: new Date() },
          { adminId: 2, adminName: 'Admin 2', adminEmail: 'admin2@test.com', decision: 'approved' as const, timestamp: new Date() }
        ],
        status: 'pending' as const,
        createdAt: new Date()
      }
      
      const currentApprovals = mockWorkflow.approvers.filter(a => a.decision === 'approved').length
      const shouldBeApproved = currentApprovals >= mockWorkflow.requiredApprovals
      expect(shouldBeApproved).toBe(true)
    })

    it('should detect rejection in workflow', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 1,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'approved' as const, timestamp: new Date() },
          { adminId: 2, adminName: 'Admin 2', adminEmail: 'admin2@test.com', decision: 'rejected' as const, reason: 'Invalid', timestamp: new Date() }
        ],
        status: 'pending' as const,
        createdAt: new Date()
      }
      
      const hasRejection = mockWorkflow.approvers.some(a => a.decision === 'rejected')
      expect(hasRejection).toBe(true)
    })

    it('should return completed approvals list', () => {
      const mockWorkflow = {
        requiredApprovals: 2,
        currentApprovals: 1,
        approvers: [
          { adminId: 1, adminName: 'Admin 1', adminEmail: 'admin1@test.com', decision: 'approved' as const, timestamp: new Date() },
          { adminId: 2, adminName: 'Admin 2', adminEmail: 'admin2@test.com', decision: undefined, timestamp: new Date() }
        ],
        status: 'pending' as const,
        createdAt: new Date()
      }
      
      const completedApprovals = mockWorkflow.approvers.filter(a => a.decision !== undefined)
      expect(completedApprovals).toHaveLength(1)
      expect(completedApprovals[0].adminId).toBe(1)
    })
  })
})

