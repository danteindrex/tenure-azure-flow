import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build query using user_payments table
    let query = supabaseAdmin
      .from('user_payments')
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

    if (type && type !== 'all') {
      query = query.eq('payment_type', type);
    }

    if (search) {
      query = query.or(`users.name.ilike.%${search}%,users.email.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from('user_payments')
      .select('*', { count: 'exact', head: true });

    // Get paginated data
    const { data: transactions, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        page,
        pages: Math.ceil((count || 0) / limit),
        total: count || 0,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data: transaction, error } = await supabaseAdmin
      .from('user_payments')
      .insert([{
        user_id: body.user_id,
        payment_type: body.type,
        amount: body.amount,
        currency: body.currency || 'USD',
        status: body.status || 'pending',
        provider: body.provider || 'manual',
        payment_date: new Date().toISOString(),
        metadata: body.metadata || null,
        is_first_payment: false
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}