import { pool } from '../config/database';
import { Payment } from '../types';

export class PaymentModel {
  static async create(data: {
    memberid: number;
    subscriptionid?: number;
    stripe_payment_intent_id?: string;
    stripe_invoice_id?: string;
    stripe_charge_id?: string;
    amount: number;
    currency: string;
    payment_type: 'initial' | 'recurring' | 'one_time';
    status: string;
    is_first_payment: boolean;
    receipt_url?: string;
  }): Promise<Payment> {
    const query = `
      INSERT INTO user_payments (
        user_id, subscription_id, provider_payment_id, provider_invoice_id,
        provider_charge_id, amount, currency, payment_type, status,
        is_first_payment, receipt_url, payment_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;

    const values = [
      data.memberid,
      data.subscriptionid,
      data.stripe_payment_intent_id,
      data.stripe_invoice_id,
      data.stripe_charge_id,
      data.amount,
      data.currency,
      data.payment_type,
      data.status,
      data.is_first_payment,
      data.receipt_url,
    ];

    const result = await pool.query<Payment>(query, values);
    return result.rows[0];
  }

  static async findByMemberId(memberId: number | string): Promise<Payment[]> {
    const query = `
      SELECT * FROM user_payments
      WHERE user_id = $1
      ORDER BY payment_date DESC
      LIMIT 50
    `;

    const result = await pool.query<Payment>(query, [memberId]);
    return result.rows;
  }

  static async findByStripePaymentIntentId(intentId: string): Promise<Payment | null> {
    const query = 'SELECT * FROM user_payments WHERE provider_payment_id = $1';
    const result = await pool.query<Payment>(query, [intentId]);
    return result.rows[0] || null;
  }

  static async update(paymentId: number, data: Partial<Payment>): Promise<Payment> {
    const fields = Object.keys(data)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [
      paymentId,
      ...Object.keys(data)
        .filter(key => key !== 'id' && key !== 'created_at')
        .map(key => data[key as keyof Payment]),
    ];

    const query = `
      UPDATE user_payments
      SET ${fields}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query<Payment>(query, values);
    return result.rows[0];
  }

  static async getTotalPaidByMember(memberId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM user_payments
      WHERE user_id = $1 AND status = 'succeeded'
    `;

    const result = await pool.query<{ total: string }>(query, [memberId]);
    return parseFloat(result.rows[0].total);
  }
}
