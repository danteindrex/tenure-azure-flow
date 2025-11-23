import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper to catch promise rejections
 * and pass them to Express error handler
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
