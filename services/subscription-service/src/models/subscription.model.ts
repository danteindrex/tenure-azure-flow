import { pool } from '../config/database';
import { Subscription } from '../types';

export class SubscriptionModel {
  static async create(data: {
    memberid: number;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    status: string;
    current_period_start: Date;
    current_period_end: Date;
  }): Promise<Subscription> {
    const query = `
      INSERT INTO subscription (
        memberid, stripe_subscription_id, stripe_customer_id,
        status, current_period_start, current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.memberid,
      data.stripe_subscription_id,
      data.stripe_customer_id,
      data.status,
      data.current_period_start,
      data.current_period_end,
    ];

    const result = await pool.query<Subscription>(query, values);
    return result.rows[0];
  }

  static async findByMemberId(memberId: number): Promise<Subscription | null> {
    const query = 'SELECT * FROM subscription WHERE memberid = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query<Subscription>(query, [memberId]);
    return result.rows[0] || null;
  }

  static async findByStripeSubscriptionId(stripeSubId: string): Promise<Subscription | null> {
    const query = 'SELECT * FROM subscription WHERE stripe_subscription_id = $1';
    const result = await pool.query<Subscription>(query, [stripeSubId]);
    return result.rows[0] || null;
  }

  static async update(subscriptionId: number, data: Partial<Subscription>): Promise<Subscription> {
    const fields = Object.keys(data)
      .filter(key => key !== 'subscriptionid' && key !== 'created_at')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [
      subscriptionId,
      ...Object.keys(data)
        .filter(key => key !== 'subscriptionid' && key !== 'created_at')
        .map(key => data[key as keyof Subscription]),
    ];

    const query = `
      UPDATE subscription
      SET ${fields}, updated_at = NOW()
      WHERE subscriptionid = $1
      RETURNING *
    `;

    const result = await pool.query<Subscription>(query, values);
    return result.rows[0];
  }

  static async cancelSubscription(subscriptionId: number): Promise<Subscription> {
    const query = `
      UPDATE subscription
      SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
      WHERE subscriptionid = $1
      RETURNING *
    `;

    const result = await pool.query<Subscription>(query, [subscriptionId]);
    return result.rows[0];
  }

  static async getActiveSubscriptions(): Promise<Subscription[]> {
    const query = `
      SELECT * FROM subscription
      WHERE status IN ('active', 'trialing')
      ORDER BY created_at DESC
    `;

    const result = await pool.query<Subscription>(query);
    return result.rows;
  }
}
