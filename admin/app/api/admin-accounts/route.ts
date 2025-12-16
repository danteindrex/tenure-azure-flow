import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { adminAccountQueries, auditLogQueries } from '@/lib/db/queries';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    const admins = await adminAccountQueries.getAll();

    // Remove sensitive fields (hash, salt) from all admin objects
    const adminsWithoutSensitiveData = admins.map(admin => {
      const { hash, salt, resetPasswordToken, twoFactorSecret, backupCodes, ...adminData } = admin;
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
    const { isSuperAdmin, adminId, error: authError } = await verifyAdminRole(request);
    
    if (authError || !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admins can create admin accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role = 'admin', status = 'active' } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingAdmin = await adminAccountQueries.findByEmail(email);
    if (existingAdmin) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Generate salt and hash using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create admin account
    const admin = await adminAccountQueries.create({
      email,
      hash,
      salt,
      name,
      role,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Remove sensitive fields from response
    const { hash: _, salt: __, resetPasswordToken, twoFactorSecret, backupCodes, ...adminWithoutSensitive } = admin;

    // Log admin account creation
    await auditLogQueries.create({
      adminId: adminId ? parseInt(adminId) : undefined,
      adminEmail: email,
      action: 'create',
      resource: 'admin_account',
      resourceId: admin.id.toString(),
      details: { 
        email: admin.email,
        role: admin.role,
        created_by: 'super_admin'
      },
      status: 'success',
    });

    return NextResponse.json({ admin: adminWithoutSensitive }, { status: 201 });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin account' }, { status: 500 });
  }
}
