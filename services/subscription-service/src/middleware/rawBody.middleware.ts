import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to capture raw body for Stripe webhook signature verification
 * Must be applied before express.json()
 */
export function rawBodyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.originalUrl === '/api/webhooks/stripe') {
    let data = '';
    req.setEncoding('utf8');

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      (req as any).rawBody = data;
      req.body = data;
      next();
    });
  } else {
    next();
  }
}
