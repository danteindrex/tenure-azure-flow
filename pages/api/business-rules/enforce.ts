import { NextApiRequest, NextApiResponse } from 'next';
import BusinessLogicService from '@/src/lib/business-logic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize business logic service
    const businessLogic = new BusinessLogicService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Starting business rule enforcement...');

    // 1. Enforce payment defaults (BR-8)
    const defaultEnforcement = await businessLogic.enforcePaymentDefaults();
    console.log(`Default enforcement: ${defaultEnforcement.updated} members updated, ${defaultEnforcement.removed} removed from queue`);

    // 2. Update queue positions based on tenure (BR-5, BR-9, BR-10)
    const queueUpdate = await businessLogic.updateQueuePositions();
    console.log(`Queue positions updated: ${queueUpdate ? 'Success' : 'Failed'}`);

    // 3. Get current payout status (BR-3, BR-4, BR-6)
    const payoutStatus = await businessLogic.getPayoutStatus();
    console.log(`Payout status: Fund Ready: ${payoutStatus.fundReady}, Time Ready: ${payoutStatus.timeReady}, Payout Ready: ${payoutStatus.payoutReady}`);

    // 4. Get winner order for validation (BR-5, BR-6, BR-10)
    const winnerOrder = await businessLogic.getWinnerOrder();
    console.log(`Winner order calculated: ${winnerOrder.length} eligible members`);

    const results = {
      timestamp: new Date().toISOString(),
      defaultEnforcement,
      queueUpdateSuccess: queueUpdate,
      payoutStatus: {
        fundReady: payoutStatus.fundReady,
        timeReady: payoutStatus.timeReady,
        payoutReady: payoutStatus.payoutReady,
        totalRevenue: payoutStatus.totalRevenue,
        potentialWinners: payoutStatus.potentialWinners,
        fundStatus: payoutStatus.fundStatus,
        timeStatus: payoutStatus.timeStatus
      },
      eligibleMembers: winnerOrder.length,
      topWinners: winnerOrder.slice(0, 5).map(w => ({
        position: w.queuePosition,
        memberId: w.memberId,
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