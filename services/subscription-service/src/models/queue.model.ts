import { pool } from '../config/database';
import { Queue } from '../types';

export class QueueModel {
  static async findByMemberId(memberId: number): Promise<Queue | null> {
    const query = 'SELECT * FROM queue WHERE memberid = $1';
    const result = await pool.query<Queue>(query, [memberId]);
    return result.rows[0] || null;
  }

  static async updateSubscriptionStatus(memberId: number, isActive: boolean): Promise<Queue> {
    const query = `
      UPDATE queue
      SET subscription_active = $2, updated_at = NOW()
      WHERE memberid = $1
      RETURNING *
    `;

    const result = await pool.query<Queue>(query, [memberId, isActive]);
    return result.rows[0];
  }

  static async updatePaymentStats(
    memberId: number,
    totalMonths: number,
    lifetimeTotal: number,
    lastPaymentDate: Date
  ): Promise<Queue> {
    const query = `
      UPDATE queue
      SET
        total_months_subscribed = $2,
        lifetime_payment_total = $3,
        last_payment_date = $4,
        updated_at = NOW()
      WHERE memberid = $1
      RETURNING *
    `;

    const result = await pool.query<Queue>(
      query,
      [memberId, totalMonths, lifetimeTotal, lastPaymentDate]
    );
    return result.rows[0];
  }
}
