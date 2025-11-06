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
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV) {
  app.set('trust proxy', true);
  logger.info('Running in serverless mode - trust proxy enabled');
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  // Skip failed requests in serverless to avoid false positives
  skipFailedRequests: true,
});

// Middleware - Security
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(cookieParser());

// Middleware - Body parsing
// Use raw body for Stripe webhooks, JSON for everything else
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'subscription-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);

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
  try {
    // Test database connection using Drizzle pool
    await pool.query('SELECT 1');
    logger.info('✅ Database connection successful');

    app.listen(config.port, () => {
      logger.info(`Subscription Service running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Database connection failed. Please check DATABASE_URL environment variable.');
    process.exit(1);
  }
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

// Start the server
startServer();

export default app;
