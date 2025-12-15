import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export async function getStripeStats() {
  try {
    // Get balance (available and pending)
    const balance = await stripe.balance.retrieve();
    
    // Get recent charges (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const charges = await stripe.charges.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0;
    subscriptions.data.forEach(sub => {
      sub.items.data.forEach(item => {
        if (item.price.recurring?.interval === 'month') {
          mrr += (item.price.unit_amount || 0) / 100;
        } else if (item.price.recurring?.interval === 'year') {
          mrr += ((item.price.unit_amount || 0) / 100) / 12;
        }
      });
    });

    // Calculate total revenue from charges
    const totalRevenue = charges.data.reduce((sum, charge) => {
      return sum + (charge.amount / 100);
    }, 0);

    // Get customer count
    const customers = await stripe.customers.list({ limit: 1 });
    const customerCount = customers.has_more ? '1000+' : customers.data.length;

    return {
      connected: true,
      mrr: `$${mrr.toLocaleString()}`,
      totalRevenue: `$${totalRevenue.toLocaleString()}`,
      activeSubscriptions: subscriptions.data.length,
      customerCount,
      availableBalance: `$${(balance.available[0]?.amount || 0) / 100}`,
      pendingBalance: `$${(balance.pending[0]?.amount || 0) / 100}`,
    };
  } catch (error) {
    console.error('Stripe stats error:', error);
    return {
      connected: false,
      error: 'Failed to fetch Stripe data',
    };
  }
}

export async function getStripeChartData() {
  try {
    const monthlyData = [];
    
    // Get data for last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = Math.floor(new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000);
      const monthEnd = Math.floor(new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime() / 1000);
      
      const charges = await stripe.charges.list({
        created: { gte: monthStart, lte: monthEnd },
        limit: 100,
      });

      const monthRevenue = charges.data.reduce((sum, charge) => {
        return sum + (charge.amount / 100);
      }, 0);

      monthlyData.push({
        month: new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthRevenue,
      });
    }

    return monthlyData;
  } catch (error) {
    console.error('Stripe chart data error:', error);
    return [];
  }
}