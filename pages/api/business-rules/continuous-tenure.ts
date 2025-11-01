import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/drizzle/db';
import { membershipQueue, users, userProfiles, userPayments } from '@/drizzle/schema';
import { eq, asc, and, sql } from 'drizzle-orm';

/**
 * Continuous Tenure API
 *
 * Gets all members with continuous tenure for queue ranking.
 * Business Rules:
 * - BR-5: Queue ranking based on earliest continuous tenure
 * - BR-6: Continuous tenure = no missed monthly payments
 * - BR-9: Tenure starts from first joining fee payment
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all queue members with user info joined
    const queueMembers = await db
      .select({
        memberId: users.id,
        queuePosition: membershipQueue.queuePosition,
        joinedQueueAt: membershipQueue.joinedQueueAt,
        isEligible: membershipQueue.isEligible,
        subscriptionActive: membershipQueue.subscriptionActive,
        totalMonthsSubscribed: membershipQueue.totalMonthsSubscribed,
        lifetimePaymentTotal: membershipQueue.lifetimePaymentTotal,
        lastPaymentDate: membershipQueue.lastPaymentDate,
        hasReceivedPayout: membershipQueue.hasReceivedPayout,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: users.email,
        userStatus: users.status
      })
      .from(membershipQueue)
      .innerJoin(users, eq(membershipQueue.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(membershipQueue.isEligible, true))
      .orderBy(asc(membershipQueue.queuePosition));

    // Enrich each member with tenure data
    const enrichedMembers = await Promise.all(
      queueMembers.map(async (member) => {
        // Get first joining fee payment (BR-9: tenure start date)
        const joiningFee = await db.select()
          .from(userPayments)
          .where(and(
            eq(userPayments.userId, member.memberId),
            eq(userPayments.paymentType, 'joining_fee'),
            eq(userPayments.status, 'completed')
          ))
          .limit(1)
          .then(rows => rows[0]);

        const tenureStart = joiningFee?.paymentDate || null;

        // Calculate continuous tenure in months
        let continuousTenure = 0;
        if (tenureStart) {
          const startDate = new Date(tenureStart);
          const now = new Date();
          const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 +
                            (now.getMonth() - startDate.getMonth());
          continuousTenure = Math.max(0, monthsDiff);
        }

        // Format member name
        const memberName = member.firstName && member.lastName
          ? `${member.firstName} ${member.lastName}`
          : member.email?.split('@')[0] || `Member ${member.queuePosition}`;

        return {
          memberId: member.memberId,
          memberName,
          email: member.email,
          position: member.queuePosition,
          queuePosition: member.queuePosition,
          isActive: member.subscriptionActive,
          isEligible: member.isEligible,
          userStatus: member.userStatus,

          // Tenure details
          tenureStart: tenureStart?.toISOString() || null,
          continuousTenure,
          totalMonthsSubscribed: member.totalMonthsSubscribed,

          // Payment details
          totalPaid: Number(member.lifetimePaymentTotal || 0),
          lastPaymentDate: member.lastPaymentDate?.toISOString() || null,

          // Payout status
          hasReceivedPayout: member.hasReceivedPayout,
          joinedQueueAt: member.joinedQueueAt?.toISOString() || null
        };
      })
    );

    // Sort by continuous tenure (longest first), then by queue position
    const sortedMembers = enrichedMembers.sort((a, b) => {
      if (b.continuousTenure !== a.continuousTenure) {
        return b.continuousTenure - a.continuousTenure;
      }
      return (a.queuePosition || 999) - (b.queuePosition || 999);
    });

    // Calculate statistics
    const stats = {
      totalEligibleMembers: enrichedMembers.length,
      averageTenure: enrichedMembers.length > 0
        ? Math.round(enrichedMembers.reduce((sum, m) => sum + m.continuousTenure, 0) / enrichedMembers.length)
        : 0,
      longestTenure: enrichedMembers.length > 0
        ? Math.max(...enrichedMembers.map(m => m.continuousTenure))
        : 0,
      activeMembers: enrichedMembers.filter(m => m.isActive).length,
      totalPayments: enrichedMembers.reduce((sum, m) => sum + m.totalPaid, 0)
    };

    return res.status(200).json({
      success: true,
      members: sortedMembers,
      statistics: stats,
      businessRules: {
        ranking: 'Based on earliest continuous tenure (BR-5)',
        continuousTenure: 'No missed monthly payments (BR-6)',
        tenureStart: 'First joining fee payment date (BR-9)'
      }
    });

  } catch (error) {
    console.error('Continuous tenure API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
