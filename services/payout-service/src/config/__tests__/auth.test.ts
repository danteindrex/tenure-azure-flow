/**
 * Auth Configuration Tests
 * 
 * Tests for Better Auth session validation and role checking
 */

import { describe, it, expect, vi } from 'vitest'
import { Request, Response } from 'express'
import { validateSession, requireAdmin, requireFinanceManager, requireMemberAccess } from '../auth'

describe('Auth Configuration', () => {
  describe('validateSession', () => {
    it('should return 401 when no token is provided', async () => {
      const req = {
        headers: {},
        cookies: {}
      } as any as Request
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as Response
      
      const next = vi.fn()
      
      await validateSession(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    it('should return 401 when user is not authenticated', () => {
      const req = {
        headers: {}
      } as any
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as Response
      
      const next = vi.fn()
      
      requireAdmin(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 403 when user is not an admin', () => {
      const req = {
        headers: {},
        user: {
          id: 'user-123',
          email: 'user@example.com',
          isAdmin: false
        }
      } as any
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as Response
      
      const next = vi.fn()
      
      requireAdmin(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN'
          })
        })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('should call next when user is an admin', () => {
      const req = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          isAdmin: true
        }
      } as any
      
      const res = {} as any as Response
      const next = vi.fn()
      
      requireAdmin(req, res, next)
      
      expect(next).toHaveBeenCalled()
    })
  })

  describe('requireFinanceManager', () => {
    it('should return 403 when user is not a finance manager', () => {
      const req = {
        headers: {},
        user: {
          id: 'user-123',
          email: 'user@example.com',
          isFinanceManager: false
        }
      } as any
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as Response
      
      const next = vi.fn()
      
      requireFinanceManager(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })

    it('should call next when user is a finance manager', () => {
      const req = {
        user: {
          id: 'finance-123',
          email: 'finance@example.com',
          isFinanceManager: true
        }
      } as any
      
      const res = {} as any as Response
      const next = vi.fn()
      
      requireFinanceManager(req, res, next)
      
      expect(next).toHaveBeenCalled()
    })
  })

  describe('requireMemberAccess', () => {
    it('should allow admin to access any user data', () => {
      const req = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          isAdmin: true
        },
        params: {
          userId: 'other-user-123'
        }
      } as any
      
      const res = {} as any as Response
      const next = vi.fn()
      
      requireMemberAccess(req, res, next)
      
      expect(next).toHaveBeenCalled()
    })

    it('should allow user to access their own data', () => {
      const req = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          isAdmin: false
        },
        params: {
          userId: 'user-123'
        }
      } as any
      
      const res = {} as any as Response
      const next = vi.fn()
      
      requireMemberAccess(req, res, next)
      
      expect(next).toHaveBeenCalled()
    })

    it('should deny user access to other user data', () => {
      const req = {
        headers: {},
        user: {
          id: 'user-123',
          email: 'user@example.com',
          isAdmin: false
        },
        params: {
          userId: 'other-user-456'
        }
      } as any
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as Response
      
      const next = vi.fn()
      
      requireMemberAccess(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
