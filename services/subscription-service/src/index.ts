import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { logger } from './config/logger';
import { pool } from '../drizzle/db';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';

const app: Application = express();

// Trust proxy for serverless environments (Vercel, AWS Lambda)
// This is required for rate limiting and getting correct client IPs
// MUST be set before rate limiter is configured
app.set('trust proxy', true);
logger.info('Trust proxy enabled for serverless/proxy environments');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skipFailedRequests: true,
  // Use a standard key generator that works with trust proxy
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware - Security (applied globally)
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));

// Cookie parser - apply first, works for all routes
app.use(cookieParser());

// Health check (no body parsing needed)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'subscription-service',
    timestamp: new Date().toISOString(),
  });
});

// Stripe webhook route - MUST be defined BEFORE json/urlencoded parsers
// Raw body is required for Stripe signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Now apply JSON and URL encoded parsers for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting only to subscription routes
app.use('/api/subscriptions', limiter, subscriptionRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
async function startServer() {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV;

  // In serverless environments (Vercel), skip upfront DB connection test
  // Connections will be established lazily per request using Supabase Transaction Mode (port 6543)
  if (!isServerless) {
    try {
      // Test database connection using Drizzle pool
      await pool.query('SELECT 1');
      logger.info('✅ Database connection successful');
    } catch (error) {
      logger.error('Failed to start server:', error);
      logger.error('Database connection failed. Please check DATABASE_URL environment variable.');
      process.exit(1);
    }
  } else {
    logger.info('🚀 Running in serverless mode - database connections will be established per-request');
  }

  app.listen(config.port, () => {
    logger.info(`Subscription Service running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Health check: http://localhost:${config.port}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// For local development, start the server
// For Vercel serverless, just export the app
if (!process.env.VERCEL) {
  startServer();
}

// Export for Vercel serverless (CommonJS)
module.exports = app;
// Also export as default for TypeScript
export default app;
