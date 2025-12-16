import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface StripeAnalytics {
  totalRevenue: number;
  monthlyRevenue: Array<{ month: string; revenue: number; subscriptions: number }>;
  subscriptionStats: {
    active: number;
    canceled: number;
    pastDue: number;
    trialing: number;
  };
  topPlans: Array<{ name: string; count: number; revenue: number }>;
  churnRate: number;
  mrr: number; // Monthly Recurring Revenue
}

export async function getStripeAnalytics(): Promise<StripeAnalytics> {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    // Get all subscriptions
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      created: { gte: Math.floor(sixMonthsAgo.getTime() / 1000) }
    });

    // Get charges for revenue calculation
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: Math.floor(sixMonthsAgo.getTime() / 1000) }
    });

    // Calculate total revenue
    const totalRevenue = charges.data
      .filter(charge => charge.paid)
      .reduce((sum, charge) => sum + charge.amount, 0) / 100;

    // Calculate monthly revenue
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthCharges = charges.data.filter(charge => {
        const chargeDate = new Date(charge.created * 1000);
        return chargeDate >= monthStart && chargeDate <= monthEnd && charge.paid;
      });
      
      const monthSubs = subscriptions.data.filter(sub => {
        const subDate = new Date(sub.created * 1000);
        return subDate >= monthStart && subDate <= monthEnd;
      });

      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthCharges.reduce((sum, charge) => sum + charge.amount, 0) / 100,
        subscriptions: monthSubs.length
      });
    }

    // Calculate subscription stats
    const subscriptionStats = {
      active: subscriptions.data.filter(sub => sub.status === 'active').length,
      canceled: subscriptions.data.filter(sub => sub.status === 'canceled').length,
      pastDue: subscriptions.data.filter(sub => sub.status === 'past_due').length,
      trialing: subscriptions.data.filter(sub => sub.status === 'trialing').length,
    };

    // Get product information for top plans
    const products = await stripe.products.list({ limit: 20 });
    const prices = await stripe.prices.list({ limit: 50 });
    
    const planStats = new Map();
    subscriptions.data.forEach(sub => {
      if (sub.items.data[0]) {
        const priceId = sub.items.data[0].price.id;
        const price = prices.data.find(p => p.id === priceId);
        const product = products.data.find(p => p.id === price?.product);
        
        if (product) {
          const existing = planStats.get(product.name) || { count: 0, revenue: 0 };
          planStats.set(product.name, {
            count: existing.count + 1,
            revenue: existing.revenue + (price?.unit_amount || 0) / 100
          });
        }
      }
    });

    const topPlans = Array.from(planStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate churn rate (simplified)
    const activeCount = subscriptionStats.active;
    const canceledCount = subscriptionStats.canceled;
    const churnRate = activeCount > 0 ? (canceledCount / (activeCount + canceledCount)) * 100 : 0;

    // Calculate MRR
    const activeSubs = subscriptions.data.filter(sub => sub.status === 'active');
    const mrr = activeSubs.reduce((sum, sub) => {
      if (sub.items.data[0]) {
        const price = sub.items.data[0].price;
        let monthlyAmount = price.unit_amount || 0;
        
        // Convert to monthly if needed
        if (price.recurring?.interval === 'year') {
          monthlyAmount = monthlyAmount / 12;
        }
        
        return sum + monthlyAmount;
      }
      return sum;
    }, 0) / 100;

    return {
      totalRevenue,
      monthlyRevenue,
      subscriptionStats,
      topPlans,
      churnRate,
      mrr
    };
  } catch (error) {
    console.error('Error fetching Stripe analytics:', error);
    throw error;
  }
}

export { stripe };