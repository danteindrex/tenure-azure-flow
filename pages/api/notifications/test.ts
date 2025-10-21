import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { BUSINESS_RULES } from '@/src/lib/business-logic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, scenario, allScenarios } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const testNotifications = [];

    // Define all test scenarios
    const scenarios = {
      joining_fee_required: {
        type: 'payment',
        title: 'Joining Fee Required',
        message: `Please complete your joining fee of $${BUSINESS_RULES.JOINING_FEE} to activate your membership and start your tenure tracking. This is required to participate in the payout system.`,
        priority: 'urgent',
        metadata: {
          amount: BUSINESS_RULES.JOINING_FEE,
          payment_type: 'joining_fee',
          test: true
        }
      },
      monthly_payment_due: {
        type: 'payment',
        title: 'Monthly Payment Due Soon',
        message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is due in 3 days. Ensure payment to maintain continuous tenure.`,
        priority: 'high',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          days_until_due: 3,
          test: true
        }
      },
      payment_overdue: {
        type: 'payment',
        title: 'Monthly Payment Overdue',
        message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is 5 days overdue. You have ${BUSINESS_RULES.PAYMENT_GRACE_DAYS - 5} days remaining before default.`,
        priority: 'urgent',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          days_overdue: 5,
          grace_days_remaining: BUSINESS_RULES.PAYMENT_GRACE_DAYS - 5,
          test: true
        }
      },
      payment_default_risk: {
        type: 'payment',
        title: 'Payment Default - Membership at Risk',
        message: `Your membership is in default due to missed monthly payments. You have exceeded the ${BUSINESS_RULES.PAYMENT_GRACE_DAYS}-day grace period. Pay immediately to avoid losing your queue position permanently.`,
        priority: 'urgent',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          default_status: true,
          test: true
        }
      },
      payment_failed: {
        type: 'payment',
        title: 'Payment Failed',
        message: `Your recent payment of $${BUSINESS_RULES.MONTHLY_FEE} failed. Reason: Insufficient funds. Please update your payment method and try again.`,
        priority: 'high',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          failure_reason: 'Insufficient funds',
          test: true
        }
      },
      payout_ready: {
        type: 'milestone',
        title: '🎉 Payout Conditions Met!',
        message: `Fund has reached $100,000 with 1 potential winner. Payout process can begin for eligible members.`,
        priority: 'high',
        metadata: {
          fund_amount: 100000,
          potential_winners: 1,
          payout_ready: true,
          test: true
        }
      },
      queue_position_update: {
        type: 'queue',
        title: '🏆 Queue Position Updated',
        message: `You are now 2nd in line for payout based on your continuous tenure. Keep up your payments to maintain your position!`,
        priority: 'medium',
        metadata: {
          queue_position: 2,
          position_change: 'up',
          test: true
        }
      },
      tenure_milestone: {
        type: 'milestone',
        title: '🎯 Tenure Milestone Reached',
        message: `Congratulations! You've completed 12 months of continuous tenure. Your dedication puts you in a strong position for future payouts.`,
        priority: 'medium',
        metadata: {
          tenure_months: 12,
          milestone_type: 'tenure',
          test: true
        }
      },
      fund_progress: {
        type: 'system',
        title: '💰 Fund Building Progress',
        message: `Current fund: $75,000. Need $25,000 more to reach minimum payout threshold. We're getting closer to the first payout!`,
        priority: 'low',
        metadata: {
          current_fund: 75000,
          target_fund: 100000,
          remaining_needed: 25000,
          test: true
        }
      }
    };

    // Create notifications based on request
    if (allScenarios) {
      // Create all test notifications
      for (const [key, notificationData] of Object.entries(scenarios)) {
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            ...notificationData,
            is_read: false,
            action_url: '/dashboard/payments',
            action_text: notificationData.type === 'payment' ? 'Pay Now' : 'View Details'
          })
          .select()
          .single();

        if (error) {
          console.error(`Error creating ${key} notification:`, error);
        } else {
          testNotifications.push(data);
        }

        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else if (scenario && scenarios[scenario]) {
      // Create single test notification
      const notificationData = scenarios[scenario];
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          ...notificationData,
          is_read: false,
          action_url: '/dashboard/payments',
          action_text: notificationData.type === 'payment' ? 'Pay Now' : 'View Details'
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${scenario} notification:`, error);
        return res.status(500).json({ error: `Failed to create ${scenario} notification` });
      }

      testNotifications.push(data);
    } else {
      return res.status(400).json({ error: 'Invalid scenario or missing allScenarios flag' });
    }

    return res.status(200).json({
      success: true,
      message: `Created ${testNotifications.length} test notification${testNotifications.length > 1 ? 's' : ''}`,
      notifications: testNotifications,
      scenarios_available: Object.keys(scenarios)
    });

  } catch (error) {
    console.error('Test notification creation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}