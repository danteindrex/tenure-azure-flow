import axios from 'axios';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Subscription API Service
 * Communicates with the main subscription service to fetch revenue data
 */
export class SubscriptionAPIService {
  private baseUrl: string;

  constructor() {
    // Get subscription service URL from environment or use default
    this.baseUrl = process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001';
  }

  /**
   * Get total revenue from subscription service
   * @returns Total revenue in dollars
   */
  async getTotalRevenue(): Promise<number> {
    try {
      logger.info('Fetching total revenue from subscription service');

      const response = await axios.get(`${this.baseUrl}/api/revenue/total`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const totalRevenue = response.data.data?.totalRevenue || 0;

      logger.info('Total revenue fetched successfully', { totalRevenue });

      return totalRevenue;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to fetch revenue from subscription service', {
          status: error.response?.status,
          message: error.message,
          url: `${this.baseUrl}/api/revenue/total`,
        });

        // Return 0 if service is unavailable (don't crash the app)
        if (error.code === 'ECONNREFUSED') {
          logger.warn('Subscription service unavailable, returning 0 revenue');
          return 0;
        }
      }

      logger.error('Unexpected error fetching revenue', error);
      return 0;
    }
  }

  /**
   * Get revenue breakdown by time period
   * @param startDate - Start date for revenue calculation
   * @param endDate - End date for revenue calculation
   * @returns Revenue data for the specified period
   */
  async getRevenueByPeriod(startDate: Date, endDate: Date): Promise<{
    total: number;
    breakdown: Array<{ date: string; amount: number }>;
  }> {
    try {
      logger.info('Fetching revenue by period', { startDate, endDate });

      const response = await axios.get(`${this.baseUrl}/api/revenue/period`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        timeout: 10000,
      });

      const data = response.data.data || { total: 0, breakdown: [] };

      logger.info('Revenue by period fetched successfully', {
        total: data.total,
        entries: data.breakdown.length,
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch revenue by period', error);
      return { total: 0, breakdown: [] };
    }
  }

  /**
   * Get business launch date from subscription service
   * Falls back to env variable if service is unavailable
   * @returns Business launch date
   */
  async getBusinessLaunchDate(): Promise<Date> {
    try {
      logger.info('Fetching business launch date from subscription service');

      const response = await axios.get(`${this.baseUrl}/api/business/launch-date`, {
        timeout: 5000,
      });

      const launchDate = new Date(response.data.data?.launchDate);

      logger.info('Business launch date fetched', { launchDate });

      return launchDate;
    } catch (error) {
      logger.warn('Failed to fetch launch date from service, using env variable');
      return new Date(env.BUSINESS_LAUNCH_DATE);
    }
  }
}

export const subscriptionAPIService = new SubscriptionAPIService();
