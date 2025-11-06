import { Pool, PoolConfig } from 'pg';
import { config } from './env';
import { logger } from './logger';

// Detect if running in serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV;

const poolConfig: PoolConfig = {
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  // Optimized for serverless environments (Vercel/AWS Lambda)
  max: isServerless ? 1 : 10, // Only 1 connection per serverless instance
  min: isServerless ? 0 : 2,  // No idle connections in serverless
  idleTimeoutMillis: isServerless ? 10000 : 60000, // Close faster in serverless
  connectionTimeoutMillis: isServerless ? 5000 : 15000, // Fail faster in serverless
  allowExitOnIdle: isServerless ? true : false, // Allow pool to close in serverless
};

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  logger.info('Database pool configuration:', {
    isServerless,
    max: poolConfig.max,
    min: poolConfig.min,
    idleTimeout: poolConfig.idleTimeoutMillis,
    connectionTimeout: poolConfig.connectionTimeoutMillis
  });
}

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    logger.info('Database connection established');
  }
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  // Don't exit in serverless - let the platform handle it
  if (!isServerless) {
    process.exit(-1);
  }
});

export async function testConnection(): Promise<boolean> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.info(`Database connection attempt ${retries + 1}/${maxRetries}`);
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      retries++;
      logger.error(`Database connection attempt ${retries} failed:`, error);
      
      if (retries < maxRetries) {
        logger.info(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  logger.error('All database connection attempts failed');
  return false;
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
