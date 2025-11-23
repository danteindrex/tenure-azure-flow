import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Server
  PORT: z.string().default('3002'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),

  // Business Rules
  BUSINESS_LAUNCH_DATE: z.string().datetime(),
  PAYOUT_THRESHOLD: z.string().transform(Number),
  RETENTION_FEE: z.string().transform(Number),
  REWARD_PER_WINNER: z.string().transform(Number),

  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string(),
  SMTP_SECURE: z.string().optional(),
  EMAIL_FROM: z.string().email(),
  EMAIL_FROM_NAME: z.string(),

  // Security
  ENCRYPTION_KEY: z.string().length(32),

  // External Services
  SUBSCRIPTION_SERVICE_URL: z.string().url().optional(),

  // AWS (optional - for S3)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
});

try {
  const parsed = envSchema.parse(process.env);
  logger.info('Environment variables validated successfully');
  export const env = parsed;
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('Environment validation failed', {
      errors: error.errors,
    });
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}
