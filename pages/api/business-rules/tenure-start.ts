import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { users, userPayments } from '@/drizzle/schema';
import { eq, and, asc } from 'drizzle-orm';

/**
 * BR-9: Tenure Start Calculation
 *
 * Tenure starts from the date of the first joining fee payment.
 * This is the foundation for calculating continuous tenure months.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get database user
    const dbUser = await db.select().from(users)
      .where(eq(users.authUserId, session.user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find first joining fee payment (BR-9: Tenure starts from joining fee)
    const joiningFeePayment = await db.select()
      .from(userPayments)
      .where(and(
        eq(userPayments.userId, dbUser.id),
        eq(userPayments.paymentType, 'joining_fee'),
        eq(userPayments.status, 'completed')
      ))
      .orderBy(asc(userPayments.paymentDate))
      .limit(1)
      .then(rows => rows[0]);

    if (!joiningFeePayment) {
      return res.status(200).json({
        success: true,
        tenureStart: null,
        message: 'No joining fee payment found. Tenure has not started yet.'
      });
    }

    return res.status(200).json({
      success: true,
      tenureStart: joiningFeePayment.paymentDate,
      paymentId: joiningFeePayment.id,
      amount: Number(joiningFeePayment.amount)
    });

  } catch (error) {
    console.error('Tenure start API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
