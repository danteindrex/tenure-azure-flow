import { pool } from '../config/database';
import { Queue } from '../types';

export class QueueModel {
  static async findByMemberId(memberId: number): Promise<Queue | null> {
    const query = 'SELECT * FROM membership_queue WHERE user_id = $1';
    const result = await pool.query<Queue>(query, [memberId]);
    return result.rows[0] || null;
  }

  static async removeFromQueue(userId: number): Promise<void> {
    // First, get the position of the user being removed
    const getPositionQuery = `
      SELECT queue_position FROM membership_queue WHERE user_id = $1
    `;
    const positionResult = await pool.query(getPositionQuery, [userId.toString()]);
    
    if (positionResult.rows.length === 0) {
      return; // User not in queue
    }
    
    const removedPosition = positionResult.rows[0].queue_position;
    
    // Remove the user from queue
    const deleteQuery = `
      DELETE FROM membership_queue WHERE user_id = $1
    `;
    await pool.query(deleteQuery, [userId.toString()]);
    
    // Move everyone behind them up one position
    if (removedPosition) {
      const reorderQuery = `
        UPDATE membership_queue 
        SET queue_position = queue_position - 1
        WHERE queue_position > $1
      `;
      await pool.query(reorderQuery, [removedPosition]);
    }
  }

  static async updatePaymentStats(
    memberId: number,
    totalMonths: number,
    lifetimeTotal: number,
    lastPaymentDate: Date
  ): Promise<Queue> {
    const query = `
      UPDATE membership_queue
      SET
        months_in_queue = $2,
        total_amount_paid = $3,
        last_payment_date = $4,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await pool.query<Queue>(
      query,
      [memberId, totalMonths, lifetimeTotal, lastPaymentDate]
    );
    return result.rows[0];
  }
}
