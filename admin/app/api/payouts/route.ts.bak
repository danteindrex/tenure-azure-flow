import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Fetch payout history
    const { data: payouts, error } = await supabaseAdmin
      .from('payout_management')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          image
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payouts:', error);
    }

    // Calculate total payout pool from all payments
    const { data: payments } = await supabaseAdmin
      .from('user_payments')
      .select('amount, status');

    const totalRevenue = payments?.reduce((sum, payment) => {
      if (payment.status === 'completed' || payment.status === 'succeeded') {
        return sum + (payment.amount || 0);
      }
      return sum;
    }, 0) || 0;

    // Calculate payout pool (e.g., 10% of total revenue or custom logic)
    const payoutPool = totalRevenue * 0.1; // 10% of revenue goes to payout pool

    // Calculate next payout date (e.g., first day of next month)
    const now = new Date();
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthsUntilPayout = Math.ceil((nextPayoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    const nextPayoutFormatted = nextPayoutDate.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });

    return NextResponse.json({
      payouts: payouts || [],
      stats: {
        totalPayoutPool: payoutPool,
        nextPayoutDate: nextPayoutFormatted,
        monthsUntilPayout: monthsUntilPayout
      }
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}