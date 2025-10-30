import { Pool, PoolConfig } from 'pg';
import { config } from './env';
import { logger } from './logger';

const poolConfig: PoolConfig = {
  connectionString: config.databaseUri,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000, // Increased to 15 seconds for Supabase
  //acquireTimeoutMillis: 15000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
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
