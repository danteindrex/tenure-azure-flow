import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/drizzle/db';
import { userPayments, membershipQueue } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { BUSINESS_RULES } from '@/lib/business-logic';

/**
 * Payout Conditions API
 *
 * Checks if payout conditions are met based on business rules:
 * - BR-3: $100,000 minimum fund threshold
 * - BR-3: 12 months after business launch (Jan 1, 2024)
 * - BR-4: $100,000 per winner
 * - BR-5: Winners selected based on queue position and continuous tenure
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Calculate total revenue from all completed payments (BR-3)
    const totalRevenueResult = await db.select({
      total: sql<string>`COALESCE(SUM(${userPayments.amount}), 0)`
    })
    .from(userPayments)
    .where(eq(userPayments.status, 'completed'));

    const totalRevenue = Number(totalRevenueResult[0]?.total || 0);

    // Count eligible members in queue (BR-5)
    const eligibleCountResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(membershipQueue)
    .where(eq(membershipQueue.isEligible, true));

    const eligibleMembers = Number(eligibleCountResult[0]?.count || 0);

    // Count total queue members
    const totalMembersResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(membershipQueue);

    const totalMembers = Number(totalMembersResult[0]?.count || 0);

    // BR-3: Check if fund threshold is met ($100,000)
    const payoutThreshold = BUSINESS_RULES.PAYOUT_THRESHOLD; // $100,000
    const fundReady = totalRevenue >= payoutThreshold;

    // BR-3: Check if time requirement is met (12 months after Jan 1, 2024)
    const launchDate = BUSINESS_RULES.BUSINESS_LAUNCH_DATE; // Jan 1, 2024
    const requiredMonths = BUSINESS_RULES.PAYOUT_MONTHS_REQUIRED; // 12
    const requiredDate = new Date(launchDate);
    requiredDate.setMonth(requiredDate.getMonth() + requiredMonths);

    const now = new Date();
    const timeReady = now >= requiredDate;

    // Both conditions must be met
    const payoutReady = fundReady && timeReady;

    // BR-4: Calculate potential winners ($100K each)
    const rewardPerWinner = BUSINESS_RULES.REWARD_PER_WINNER; // $100,000
    const potentialWinnersFromFund = Math.floor(totalRevenue / rewardPerWinner);
    const potentialWinners = Math.min(potentialWinnersFromFund, eligibleMembers);

    // Calculate progress percentages
    const fundProgress = Math.min((totalRevenue / payoutThreshold) * 100, 100);
    const daysUntilTimeReady = timeReady ? 0 : Math.ceil((requiredDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate next payout date
    let nextPayoutDate: string | null = null;
    if (!payoutReady) {
      if (!timeReady) {
        nextPayoutDate = requiredDate.toISOString();
      } else {
        // Fund not ready, estimate based on current revenue growth
        nextPayoutDate = 'Fund threshold not met yet';
      }
    }

    return res.status(200).json({
      success: true,
      payoutStatus: {
        // Readiness flags
        fundReady,
        timeReady,
        payoutReady,

        // Fund details
        totalRevenue,
        payoutThreshold,
        fundProgress: Math.round(fundProgress * 100) / 100,
        remainingToThreshold: Math.max(0, payoutThreshold - totalRevenue),

        // Time details
        launchDate: launchDate.toISOString(),
        requiredDate: requiredDate.toISOString(),
        daysUntilTimeReady,

        // Winners calculation
        potentialWinners,
        rewardPerWinner,
        eligibleMembers,
        totalMembers,

        // Next steps
        nextPayoutDate,

        // Business rules reference
        businessRules: {
          payoutThreshold: `$${(payoutThreshold / 1000).toFixed(0)}K (BR-3)`,
          rewardPerWinner: `$${(rewardPerWinner / 1000).toFixed(0)}K (BR-4)`,
          timeRequirement: `${requiredMonths} months after launch (BR-3)`,
          eligibilityBased: 'Continuous tenure & queue position (BR-5)'
        }
      }
    });

  } catch (error) {
    console.error('Payout conditions API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
