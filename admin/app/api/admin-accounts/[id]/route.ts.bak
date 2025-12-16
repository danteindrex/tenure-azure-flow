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
async function verifyAdminRole(): Promise<{ isSuperAdmin: boolean; adminId: string | null; error: string | null }> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      console.log('No token found in cookies');
      return { isSuperAdmin: false, adminId: null, error: 'Unauthorized' };
    }

    const decoded = verify(token, JWT_SECRET) as any;
    console.log('Decoded token role:', decoded.role);
    
    const isSuperAdmin = decoded.role === 'super_admin';
    console.log('Is super admin:', isSuperAdmin);
    
    return { isSuperAdmin, adminId: decoded.id, error: null };
  } catch (error) {
    console.error('Token verification error:', error);
    return { isSuperAdmin: false, adminId: null, error: 'Invalid token' };
  }
}

// PUT - Update admin account
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is super admin
    const { isSuperAdmin, error: authError } = await verifyAdminRole();
    
    if (authError || !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admins can update admin accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role, status } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only add fields that are provided
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    // Only hash and update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      updateData.hash = hash;
      updateData.salt = salt;
    }

    console.log('Updating admin with data:', { ...updateData, password: '***', hash: '***', salt: '***' });

    const { data, error } = await supabaseAdmin
      .from('admin')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: error.message || 'Failed to update admin account' },
        { status: 500 }
      );
    }

    console.log('Admin updated successfully:', data?.id);

    // Remove sensitive fields from response
    const { password: _, hash: __, salt: ___, reset_password_token: ____, ...adminWithoutSensitiveData } = data;

    return NextResponse.json({ admin: adminWithoutSensitiveData });
  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json({ error: 'Failed to update admin account' }, { status: 500 });
  }
}

// DELETE - Delete admin account
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is super admin
    const { isSuperAdmin, error: authError } = await verifyAdminRole();
    
    if (authError || !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admins can delete admin accounts' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('admin')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: 'Failed to delete admin account' }, { status: 500 });
  }
}
