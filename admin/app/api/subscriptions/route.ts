import { NextResponse } from 'next/server';
import { billingScheduleQueries, subscriptionQueries } from '@/lib/db/queries';
import { count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { billingSchedules } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased to show more subscriptions
    const status = searchParams.get('status');

    const offset = (page - 1) * limit;

    // Fetch billing schedules with user data
    const results = status === 'active' || !status || status === 'all'
      ? await billingScheduleQueries.getAllActive(limit, offset)
      : await billingScheduleQueries.getAll(limit, offset);

    // Transform to match expected subscription format
    const subscriptions = results.map(({ schedule, user }) => ({
      id: schedule.id,
      user_id: schedule.userId,
      provider_subscription_id: schedule.subscriptionId,
      stripe_subscription_id: schedule.subscriptionId,
      provider: 'billing_schedule',
      status: schedule.isActive ? 'active' : 'canceled',
      current_period_start: schedule.createdAt,
      current_period_end: schedule.nextBillingDate,
      created_at: schedule.createdAt,
      users: user ? {
        id: user.id,
        name: user.name || '',
        email: user.email,
        image: user.image,
      } : null,
      billing_cycle: schedule.billingCycle,
      amount: schedule.amount ? parseFloat(schedule.amount) : 0,
      currency: schedule.currency,
    }));

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(billingSchedules);
    const total = totalResult.count;

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const subscription = await subscriptionQueries.create({
      userId: body.user_id,
      stripeSubscriptionId: body.stripe_subscription_id,
      stripePriceId: body.stripe_price_id,
      status: (body.status || 'active') as any,
      planName: body.plan_name,
      amount: body.amount,
      currency: body.currency || 'usd',
      interval: body.interval,
      currentPeriodStart: body.current_period_start ? new Date(body.current_period_start) : undefined,
      currentPeriodEnd: body.current_period_end ? new Date(body.current_period_end) : undefined,
      cancelAtPeriodEnd: false,
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}