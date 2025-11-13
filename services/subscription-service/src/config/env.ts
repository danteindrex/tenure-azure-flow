import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  INITIAL_PAYMENT_AMOUNT: z.string().default('325'),
  RECURRING_PAYMENT_AMOUNT: z.string().default('25'),
  ANNUAL_PAYMENT_AMOUNT: z.string().default('300'),
  CURRENCY: z.string().default('usd'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const env = envSchema.parse(process.env);

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  pricing: {
    initialAmount: parseFloat(env.INITIAL_PAYMENT_AMOUNT),
    recurringAmount: parseFloat(env.RECURRING_PAYMENT_AMOUNT),
    annualAmount: parseFloat(env.ANNUAL_PAYMENT_AMOUNT),
    currency: env.CURRENCY,
  },
  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(','),
  },
  frontendUrl: env.FRONTEND_URL,
};
