import { pool } from '../config/database';
import { Subscription } from '../types';
import { SUBSCRIPTION_STATUS, mapStripeSubscriptionStatus } from '../config/status-ids';

export class SubscriptionModel {
  static async create(data: {
    user_id: string;
    provider_subscription_id: string;
    provider_customer_id: string;
    subscription_status_id: number;
    current_period_start: Date;
    current_period_end: Date;
  }): Promise<Subscription> {
    const query = `
      INSERT INTO user_subscriptions (
        user_id, provider, provider_subscription_id, provider_customer_id,
        subscription_status_id, current_period_start, current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      data.user_id,
      'stripe', // Default provider
      data.provider_subscription_id,
      data.provider_customer_id,
      data.subscription_status_id,
      data.current_period_start,
      data.current_period_end,
    ];

    const result = await pool.query<Subscription>(query, values);
    return result.rows[0];
  }

  /**
   * Find all subscriptions for a user (users can have multiple subscriptions)
   */
  static async findAllByUserId(userId: string): Promise<Subscription[]> {
    const query = 'SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query<Subscription>(query, [userId]);
    return result.rows;
  }

  /**
   * @deprecated Use findAllByUserId instead (returns array for multi-subscription support)
   * Find most recent subscription for a user (backward compatibility)
   */
  static async findByUserId(userId: string): Promise<Subscription | null> {
    const query = 'SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query<Subscription>(query, [userId]);
    return result.rows[0] || null;
  }

  // Legacy compatibility method
  static async findByMemberId(memberId: number): Promise<Subscription | null> {
    // For backward compatibility, try to find user by old member ID logic
    const userQuery = `
      SELECT u.id FROM users u 
      WHERE u.id::text = $1::text
      LIMIT 1
    `;
    const userResult = await pool.query(userQuery, [memberId]);
    
    if (userResult.rows.length === 0) {
      return null;
    }
    
    return this.findByUserId(userResult.rows[0].id);
  }

  static async findByStripeSubscriptionId(stripeSubId: string): Promise<Subscription | null> {
    const query = 'SELECT * FROM user_subscriptions WHERE provider_subscription_id = $1';
    const result = await pool.query<Subscription>(query, [stripeSubId]);
    return result.rows[0] || null;
  }

  static async update(subscriptionId: string, data: Partial<Subscription>): Promise<Subscription> {
    const fields = Object.keys(data)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [
      subscriptionId,
      ...Object.keys(data)
        .filter(key => key !== 'id' && key !== 'created_at')
        .map(key => data[key as keyof Subscription]),
    ];

    const query = `
      UPDATE user_subscriptions
      SET ${fields}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query<Subscription>(query, values);
    return result.rows[0];
  }

  static async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    // Use subscription_status_id FK column: 4 = Canceled
    const query = `
      UPDATE user_subscriptions
      SET subscription_status_id = $1, canceled_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query<Subscription>(query, [SUBSCRIPTION_STATUS.CANCELED, subscriptionId]);
    return result.rows[0];
  }

  static async getActiveSubscriptions(): Promise<Subscription[]> {
    // Use subscription_status_id FK column: 1 = Active, 2 = Trialing
    const query = `
      SELECT * FROM user_subscriptions
      WHERE subscription_status_id IN ($1, $2)
      ORDER BY created_at DESC
    `;

    const result = await pool.query<Subscription>(query, [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING]);
    return result.rows;
  }
}