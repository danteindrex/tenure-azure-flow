import { NextApiRequest, NextApiResponse } from 'next';
import { businessLogicService } from '@/lib/business-logic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use business logic service singleton
    const businessLogic = businessLogicService;

    console.log('Starting business rule enforcement...');

    // 1. Enforce payment defaults (BR-8)
    const defaultEnforcement = await businessLogic.enforcePaymentDefaults();
    console.log(`Default enforcement: ${defaultEnforcement.processed} members processed, ${defaultEnforcement.defaulted} members defaulted`);

    // 2. Check payout conditions (BR-3, BR-4, BR-6)
    const payoutStatus = await businessLogic.checkPayoutConditions();
    console.log(`Payout status: Fund Ready: ${payoutStatus.fundReady}, Time Ready: ${payoutStatus.timeReady}, Payout Ready: ${payoutStatus.payoutReady}`);

    // 3. Get members with continuous tenure (BR-5, BR-6, BR-10)
    const membersWithTenure = await businessLogic.getMembersWithContinuousTenure();
    console.log(`Members with continuous tenure: ${membersWithTenure.length} eligible members`);

    const results = {
      timestamp: new Date().toISOString(),
      defaultEnforcement,
      payoutStatus: {
        fundReady: payoutStatus.fundReady,
        timeReady: payoutStatus.timeReady,
        payoutReady: payoutStatus.payoutReady,
        totalRevenue: payoutStatus.totalRevenue,
        potentialWinners: payoutStatus.potentialWinners
      },
      eligibleMembers: membersWithTenure.length,
      topMembers: membersWithTenure.slice(0, 5).map(w => ({
        position: w.position,
        userId: w.memberId,
        memberName: w.memberName,
        tenureStart: w.tenureStart,
        continuousTenure: w.continuousTenure
      }))
    };

    console.log('Business rule enforcement completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Business rule enforcement completed',
      results
    });

  } catch (error) {
    console.error('Business rule enforcement error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}