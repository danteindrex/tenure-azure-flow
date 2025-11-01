import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { users, userPayments } from '@/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { BUSINESS_RULES } from '@/lib/business-logic';

/**
 * Payment Status API
 *
 * Checks user's payment health and compliance with business rules:
 * - BR-1: $300 joining fee paid
 * - BR-2: $25 monthly payments
 * - BR-8: 30-day grace period before default
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

    const dbUser = await db.select().from(users)
      .where(eq(users.authUserId, session.user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check joining fee (BR-1: $300)
    const joiningFee = await db.select()
      .from(userPayments)
      .where(and(
        eq(userPayments.userId, dbUser.id),
        eq(userPayments.paymentType, 'joining_fee'),
        eq(userPayments.status, 'completed')
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Get last monthly payment (BR-2: $25/month)
    const lastMonthlyPayment = await db.select()
      .from(userPayments)
      .where(and(
        eq(userPayments.userId, dbUser.id),
        eq(userPayments.paymentType, 'monthly_fee'),
        eq(userPayments.status, 'completed')
      ))
      .orderBy(desc(userPayments.paymentDate))
      .limit(1)
      .then(rows => rows[0]);

    // Calculate total paid
    const totalPaidResult = await db.select({
      total: sql<string>`COALESCE(SUM(${userPayments.amount}), 0)`
    })
    .from(userPayments)
    .where(and(
      eq(userPayments.userId, dbUser.id),
      eq(userPayments.status, 'completed')
    ));

    const totalPaid = Number(totalPaidResult[0]?.total || 0);

    // Count monthly payments
    const monthlyCountResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(userPayments)
    .where(and(
      eq(userPayments.userId, dbUser.id),
      eq(userPayments.paymentType, 'monthly_fee'),
      eq(userPayments.status, 'completed')
    ));

    const monthlyPaymentCount = Number(monthlyCountResult[0]?.count || 0);

    // Calculate days since last payment
    const lastPaymentDate = lastMonthlyPayment?.paymentDate || joiningFee?.paymentDate;
    let daysSinceLastPayment = 999;

    if (lastPaymentDate) {
      const lastDate = new Date(lastPaymentDate);
      const now = new Date();
      daysSinceLastPayment = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // BR-8: Default after 30 days grace period
    const gracePeriod = BUSINESS_RULES.PAYMENT_GRACE_DAYS; // 30 days
    const isInDefault = daysSinceLastPayment > gracePeriod && !!joiningFee;

    // Calculate next payment due (30 days after last payment)
    let nextPaymentDue: Date | null = null;
    if (lastPaymentDate && !isInDefault) {
      nextPaymentDue = new Date(new Date(lastPaymentDate).getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    // Determine payment status
    let status: 'current' | 'overdue' | 'pending' = 'pending';
    if (isInDefault) {
      status = 'overdue';
    } else if (joiningFee) {
      status = 'current';
    }

    return res.status(200).json({
      success: true,
      paymentStatus: {
        memberId: dbUser.id,
        hasJoiningFee: !!joiningFee,
        joiningFeeDate: joiningFee?.paymentDate || null,
        lastMonthlyPayment: lastMonthlyPayment?.paymentDate || null,
        totalPaid,
        monthlyPaymentCount,
        isInDefault,
        daysSinceLastPayment,
        nextPaymentDue: nextPaymentDue?.toISOString() || null,
        status,
        gracePeriodDays: gracePeriod,
        daysUntilDefault: !isInDefault && lastPaymentDate
          ? Math.max(0, gracePeriod - daysSinceLastPayment)
          : 0
      }
    });

  } catch (error) {
    console.error('Payment status API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
