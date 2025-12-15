import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { adminAccountQueries, auditLogQueries } from '@/lib/db/queries';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    const { isSuperAdmin, adminId, error: authError } = await verifyAdminRole();
    
    if (authError || !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admins can update admin accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role, status } = body;

    const updateData: any = {};

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

    console.log('Updating admin with data:', { ...updateData, hash: '***', salt: '***' });

    const admin = await adminAccountQueries.update(parseInt(params.id), updateData);

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin account not found' },
        { status: 404 }
      );
    }

    console.log('Admin updated successfully:', admin.id);

    // Remove sensitive fields from response
    const { hash: _, salt: __, resetPasswordToken, twoFactorSecret, backupCodes, ...adminWithoutSensitive } = admin;

    // Log the update
    await auditLogQueries.create({
      adminId: adminId ? parseInt(adminId) : undefined,
      action: 'update',
      resource: 'admin_account',
      resourceId: admin.id.toString(),
      details: { updatedFields: Object.keys(updateData) },
      status: 'success',
    });

    return NextResponse.json({ admin: adminWithoutSensitive });
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
    const { isSuperAdmin, adminId, error: authError } = await verifyAdminRole();
    
    if (authError || !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admins can delete admin accounts' },
        { status: 403 }
      );
    }

    await adminAccountQueries.delete(parseInt(params.id));

    // Log the deletion
    await auditLogQueries.create({
      adminId: adminId ? parseInt(adminId) : undefined,
      action: 'delete',
      resource: 'admin_account',
      resourceId: params.id,
      status: 'success',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: 'Failed to delete admin account' }, { status: 500 });
  }
}
