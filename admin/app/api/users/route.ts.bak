import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    // Build query using actual columns present in public.users
    // Note: Only selecting columns that exist in the database
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        auth_user_id,
        email,
        name,
        image,
        status,
        email_verified,
        two_factor_enabled,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (role) {
      query = query.eq('role', role);
    }

    // Apply pagination and ordering
    const { data: usersRaw, error, count: total } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Map to the shape expected by the UI, filling non-existent fields with sensible defaults
    const users = (usersRaw || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role || null,
      status: u.status,
      membership_type: null,
      joined_at: u.created_at,
      last_active: u.updated_at,
      avatar: u.image,
      image: u.image,
      phone: u.phone || null,
      address: u.address || null,
      email_verified: u.email_verified || false,
      two_factor_enabled: u.two_factor_enabled || false,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }));

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    const userData = {
      email,
      name,
      status: body.status || 'Pending',
      image: body.avatar || body.image || null,
      updated_at: new Date().toISOString(),
    };

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}