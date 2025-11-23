/**
 * Payout Service - Express Server
 *
 * Main entry point for the payout service microservice.
 * Handles payout eligibility, approval workflows, and payment processing.
 */

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import routes from './routes';
import { startCronJobs } from './jobs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// =====================
// Security Middleware
// =====================

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// =====================
// Body Parsing Middleware
// =====================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// =====================
// Request Logging
// =====================

app.use(requestLogger);

// =====================
// Routes
// =====================

app.use('/api', routes);

// =====================
// Error Handling
// =====================

app.use(errorHandler);

// =====================
// Start Server
// =====================

app.listen(PORT, () => {
  logger.info(`Payout Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start cron jobs in production
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON_JOBS === 'true') {
    startCronJobs();
  } else {
    logger.info('Cron jobs disabled (set ENABLE_CRON_JOBS=true to enable in development)');
  }
});

// =====================
// Graceful Shutdown
// =====================

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
