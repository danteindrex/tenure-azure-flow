import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Validation schemas
export const CreatePayoutSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  notes: z.string().optional(),
});

export const ApprovePayoutSchema = z.object({
  reason: z.string().optional(),
});

export const RejectPayoutSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export const MarkPaymentSentSchema = z.object({
  sentDate: z.string().datetime(),
  expectedArrivalDate: z.string().datetime(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const ConfirmPaymentSchema = z.object({
  completedDate: z.string().datetime(),
  confirmationNumber: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }
      next(error);
    }
  };
}
