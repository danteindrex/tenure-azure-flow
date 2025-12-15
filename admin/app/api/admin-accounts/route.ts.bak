import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to verify admin role
async function verifyAdminRole(request: Request): Promise<{ isSuperAdmin: boolean; adminId: string | null; error: string | null }> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return { isSuperAdmin: false, adminId: null, error: 'Unauthorized' };
    }

    const decoded = verify(token, JWT_SECRET) as any;
    const isSuperAdmin = decoded.role === 'super_admin';
    
    return { isSuperAdmin, adminId: decoded.id, error: null };
  } catch (error) {
    return { isSuperAdmin: false, adminId: null, error: 'Invalid token' };
  }
}

// GET - Fetch all admin accounts
export async function GET() {
  try {
    // Get all columns from admin table
    const { data: admins, error } = await supabaseAdmin
      .from('admin')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Remove sensitive fields (password, hash, salt) from all admin objects
    const adminsWithoutSensitiveData = admins?.map(admin => {
      const { password, hash, salt, reset_password_token, ...adminData } = admin;
      return adminData;
    });

    return NextResponse.json({ admins: adminsWithoutSensitiveData });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ error: 'Failed to fetch admin accounts' }, { status: 500 });
  }
}

// POST - Create new admin account
export async function POST(request: Request) {
  try {
    // Check if user is super admin
    const { isSuperAdmin, error: authError } = await verifyAdminRole(request);
    
    if (authError || !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admins can create admin accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role = 'viewer', status = 'active' } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Generate salt and hash using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Build insert object matching the actual table structure
    const insertData: any = {
      email,
      hash,
      salt,
      role,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add name if provided
    if (name) {
      insertData.name = name;
    }

    const { data, error } = await supabaseAdmin
      .from('admin')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
      throw error;
    }

    // Remove sensitive fields from response
    const { hash: _, salt: __, ...adminWithoutPassword } = data;

    // Log admin account creation
    await supabaseAdmin.from('user_audit_logs').insert({
      user_id: data.id,
      action: 'signup_attempt',
      entity_type: 'admin',
      entity_id: data.id,
      success: true,
      metadata: { 
        email: data.email,
        role: data.role,
        created_by: 'super_admin'
      }
    });

    return NextResponse.json({ admin: adminWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin account' }, { status: 500 });
  }
}
