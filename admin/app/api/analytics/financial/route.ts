import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { subDays, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixMonthsAgo = subMonths(now, 6);
    const oneYearAgo = subMonths(now, 12);

    // Fetch all financial data in parallel
    const [
      transactionsResult,
      subscriptionsResult,
      userPaymentsResult
    ] = await Promise.allSettled([
      fetchTransactionData(thirtyDaysAgo, oneYearAgo),
      fetchSubscriptionData(),
      fetchUserPaymentData(thirtyDaysAgo, oneYearAgo)
    ]);

    const transactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
    const subscriptions = subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value : null;
    const userPayments = userPaymentsResult.status === 'fulfilled' ? userPaymentsResult.value : [];

    // Calculate comprehensive financial metrics
    const totalRevenue = calculateTotalRevenue(transactions, userPayments);
    const monthlyData = generateMonthlyData(transactions, userPayments, sixMonthsAgo);
    const expenseData = calculateExpenses(totalRevenue);
    const paymentBreakdown = generatePaymentBreakdown(subscriptions, transactions);
    const recentTransactions = getRecentTransactions(transactions, userPayments);

    return NextResponse.json({
      summary: {
        totalRevenue,
        netIncome: totalRevenue - expenseData.totalExpenses,
        totalExpenses: expenseData.totalExpenses,
        collectionRate: calculateCollectionRate(subscriptions),
        revenueGrowth: calculateRevenueGrowth(monthlyData),
        expenseRatio: totalRevenue > 0 ? (expenseData.totalExpenses / totalRevenue * 100) : 0
      },
      charts: {
        monthlyRevenue: monthlyData,
        paymentBreakdown,
        expenseBreakdown: expenseData.breakdown
      },
      recentTransactions,
      subscriptionMetrics: subscriptions
    });

  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial analytics' },
      { status: 500 }
    );
  }
}

async function fetchTransactionData(thirtyDaysAgo: Date, oneYearAgo: Date) {
  // Try to fetch from both possible transaction tables
  const [transactionsResult, userPaymentsResult] = await Promise.allSettled([
    supabaseAdmin
      .from('transaction_monitoring')
      .select(`
        *,
        users!inner(
          id,
          name,
          email
        )
      `)
      .gte('created_at', oneYearAgo.toISOString())
      .order('created_at', { ascending: false }),
    
    supabaseAdmin
      .from('user_payments')
      .select(`
        *,
        users!inner(
          id,
          name,
          email
        )
      `)
      .gte('created_at', oneYearAgo.toISOString())
      .order('created_at', { ascending: false })
  ]);

  let allTransactions = [];
  
  if (transactionsResult.status === 'fulfilled' && !transactionsResult.value.error) {
    allTransactions = [...allTransactions, ...(transactionsResult.value.data || [])];
  }
  
  if (userPaymentsResult.status === 'fulfilled' && !userPaymentsResult.value.error) {
    allTransactions = [...allTransactions, ...(userPaymentsResult.value.data || [])];
  }

  return allTransactions;
}

async function fetchSubscriptionData() {
  const { data: subscriptions, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select(`
      *,
      users!inner(
        id,
        name,
        email
      )
    `);

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return null;
  }

  const active = subscriptions?.filter(s => s.status === 'active').length || 0;
  const canceled = subscriptions?.filter(s => s.status === 'canceled').length || 0;
  const pastDue = subscriptions?.filter(s => s.status === 'past_due').length || 0;
  const trialing = subscriptions?.filter(s => s.status === 'trialing').length || 0;

  return {
    total: subscriptions?.length || 0,
    active,
    canceled,
    pastDue,
    trialing,
    subscriptions: subscriptions || []
  };
}

async function fetchUserPaymentData(thirtyDaysAgo: Date, oneYearAgo: Date) {
  // This function is now redundant since we fetch user_payments in fetchTransactionData
  // Return empty array to avoid duplicate data
  return [];
}

function calculateTotalRevenue(transactions: any[], userPayments: any[]) {
  const transactionRevenue = transactions
    ?.filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;

  const paymentRevenue = userPayments
    ?.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;

  return transactionRevenue + paymentRevenue;
}

function generateMonthlyData(transactions: any[], userPayments: any[], sixMonthsAgo: Date) {
  const monthlyData = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = endOfMonth(monthStart);
    
    const monthTransactions = transactions?.filter(t => {
      const tDate = new Date(t.created_at);
      return tDate >= monthStart && tDate <= monthEnd && t.status === 'completed';
    }) || [];

    const monthPayments = userPayments?.filter(p => {
      const pDate = new Date(p.created_at);
      return pDate >= monthStart && pDate <= monthEnd && p.status === 'completed';
    }) || [];

    const transactionRevenue = monthTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const paymentRevenue = monthPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalRevenue = transactionRevenue + paymentRevenue;

    monthlyData.push({
      month: format(monthStart, 'MMM'),
      revenue: totalRevenue,
      expenses: Math.floor(totalRevenue * 0.15), // Estimate 15% expenses
      transactions: monthTransactions.length + monthPayments.length
    });
  }

  return monthlyData;
}

function calculateExpenses(totalRevenue: number) {
  // Estimate expense breakdown based on typical SaaS business model
  const totalExpenses = Math.floor(totalRevenue * 0.15);
  
  return {
    totalExpenses,
    breakdown: [
      { name: 'Infrastructure', value: Math.floor(totalExpenses * 0.4), color: 'hsl(var(--primary))' },
      { name: 'Payment Processing', value: Math.floor(totalExpenses * 0.3), color: 'hsl(var(--secondary))' },
      { name: 'Support & Operations', value: Math.floor(totalExpenses * 0.2), color: 'hsl(var(--accent))' },
      { name: 'Other', value: Math.floor(totalExpenses * 0.1), color: 'hsl(var(--muted))' }
    ]
  };
}

function generatePaymentBreakdown(subscriptions: any, transactions: any[]) {
  if (!subscriptions) return [];

  return [
    { 
      name: 'Active Subscriptions', 
      value: subscriptions.active, 
      color: 'hsl(var(--success))' 
    },
    { 
      name: 'Past Due', 
      value: subscriptions.pastDue, 
      color: 'hsl(var(--warning))' 
    },
    { 
      name: 'Canceled', 
      value: subscriptions.canceled, 
      color: 'hsl(var(--destructive))' 
    },
    { 
      name: 'Trialing', 
      value: subscriptions.trialing, 
      color: 'hsl(var(--muted))' 
    }
  ];
}

function getRecentTransactions(transactions: any[], userPayments: any[]) {
  const allTransactions = [
    ...(transactions?.map(t => ({ ...t, source: 'transactions' })) || []),
    ...(userPayments?.map(p => ({ ...p, source: 'user_payments' })) || [])
  ];

  return allTransactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
}

function calculateCollectionRate(subscriptions: any) {
  if (!subscriptions || subscriptions.total === 0) return 0;
  
  return (subscriptions.active / subscriptions.total) * 100;
}

function calculateRevenueGrowth(monthlyData: any[]) {
  if (monthlyData.length < 2) return 0;
  
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  
  if (previousMonth.revenue === 0) return 0;
  
  return ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100;
}