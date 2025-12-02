import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { user, userProfiles, userContacts, userAddresses, userSubscriptions, userPayments, membershipQueue } from '@/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '@/lib/status-ids';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get database user
    const dbUser = await db.select().from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      return res.status(404).json({
        error: 'User not found in database',
        details: 'User exists in auth but not in database. This may happen if signup is incomplete.'
      });
    }

    // Get profile
    const profile = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, dbUser.id))
      .limit(1)
      .then(rows => rows[0]);

    // Get primary phone contact
    const phoneContact = await db.select().from(userContacts)
      .where(and(
        eq(userContacts.userId, dbUser.id),
        eq(userContacts.contactType, 'phone'),
        eq(userContacts.isPrimary, true)
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Get primary address
    const address = await db.select().from(userAddresses)
      .where(and(
        eq(userAddresses.userId, dbUser.id),
        eq(userAddresses.isPrimary, true)
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Get queue data
    const queueData = await db.select().from(membershipQueue)
      .where(eq(membershipQueue.userId, dbUser.id))
      .limit(1)
      .then(rows => rows[0]);

    // Get active subscription
    const subscription = await db.select().from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, dbUser.id),
        eq(userSubscriptions.subscriptionStatusId, SUBSCRIPTION_STATUS.ACTIVE)
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Get latest payment
    const latestPayment = await db.select().from(userPayments)
      .where(eq(userPayments.userId, dbUser.id))
      .orderBy(desc(userPayments.paymentDate))
      .limit(1)
      .then(rows => rows[0]);

    // Calculate total payments
    const totalPaidResult = await db.select({
      total: sql<string>`COALESCE(SUM(${userPayments.amount}), 0)`
    })
    .from(userPayments)
    .where(and(
      eq(userPayments.userId, dbUser.id),
      eq(userPayments.paymentStatusId, PAYMENT_STATUS.SUCCEEDED)
    ));

    const totalPaid = Number(totalPaidResult[0]?.total || 0);

    // Count completed payments
    const paymentCountResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(userPayments)
    .where(and(
      eq(userPayments.userId, dbUser.id),
      eq(userPayments.paymentStatusId, PAYMENT_STATUS.SUCCEEDED)
    ));

    const paymentCount = Number(paymentCountResult[0]?.count || 0);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          emailVerified: dbUser.emailVerified,
          userStatusId: dbUser.userStatusId,
          createdAt: dbUser.createdAt
        },
        profile: profile ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          middleName: profile.middleName,
          dateOfBirth: profile.dateOfBirth,
          fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        } : null,
        contact: {
          phone: phoneContact ? {
            value: phoneContact.contactValue,
            isVerified: phoneContact.isVerified
          } : null,
          address: address ? {
            street: address.streetAddress,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode
          } : null
        },
        queue: queueData ? {
          position: queueData.queuePosition,
          joinedAt: queueData.joinedQueueAt,
          isEligible: queueData.isEligible,
          subscriptionActive: queueData.subscriptionActive,
          totalMonthsSubscribed: queueData.totalMonthsSubscribed,
          lifetimePaymentTotal: Number(queueData.lifetimePaymentTotal || 0),
          lastPaymentDate: queueData.lastPaymentDate,
          hasReceivedPayout: queueData.hasReceivedPayout
        } : null,
        subscription: subscription ? {
          id: subscription.id,
          subscriptionStatusId: subscription.subscriptionStatusId,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          provider: subscription.provider,
          providerSubscriptionId: subscription.providerSubscriptionId
        } : null,
        payments: {
          latest: latestPayment ? {
            id: latestPayment.id,
            amount: Number(latestPayment.amount),
            paymentType: latestPayment.paymentType,
            paymentDate: latestPayment.paymentDate,
            paymentStatusId: latestPayment.paymentStatusId
          } : null,
          totalPaid,
          count: paymentCount
        }
      }
    });

  } catch (error) {
    console.error('Dashboard data API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
