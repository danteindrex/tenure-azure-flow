import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build query using user_subscriptions table
    let query = supabaseAdmin
      .from('user_subscriptions')
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

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`users.name.ilike.%${search}%,users.email.ilike.%${search}%,stripe_subscription_id.ilike.%${search}%`);
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true });

    // Get paginated data
    const { data: subscriptions, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      subscriptions: subscriptions || [],
      pagination: {
        page,
        pages: Math.ceil((count || 0) / limit),
        total: count || 0,
        limit
      }
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
    
    const { data: subscription, error } = await supabaseAdmin
      .from('user_subscriptions')
      .insert([{
        user_id: body.user_id,
        provider: body.provider || 'stripe',
        provider_subscription_id: body.stripe_subscription_id,
        provider_customer_id: body.provider_customer_id || '',
        status: body.status || 'active',
        current_period_start: body.current_period_start,
        current_period_end: body.current_period_end,
        cancel_at_period_end: false
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}