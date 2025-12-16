import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { hashCode, isValidCodeFormat, generateBackupCodes } from '@/lib/utils/2fa';
import bcrypt from 'bcryptjs';
import { adminAccountQueries, twoFactorAuthQueries, adminSessionQueries, auditLogQueries } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { twoFactorAuth } from '@/lib/db/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: Request) {
  try {
    const { adminId, code } = await request.json();

    if (!adminId || !code) {
      return NextResponse.json(
        { error: 'Admin ID and code are required' },
        { status: 400 }
      );
    }

    // Validate code format
    if (!isValidCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // Get the most recent unused code for this admin
    const codeRecord = await twoFactorAuthQueries.findLatestByAdminId(adminId);

    if (!codeRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 401 }
      );
    }

    // Check attempts
    if (codeRecord.attempts >= 3) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Verify code
    const codeHash = hashCode(code);
    if (codeHash !== codeRecord.code) {
      // Increment attempts
      await db
        .update(twoFactorAuth)
        .set({ attempts: (codeRecord.attempts || 0) + 1 })
        .where(eq(twoFactorAuth.id, codeRecord.id));

      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 401 }
      );
    }

    // Mark code as used
    await twoFactorAuthQueries.markAsUsed(codeRecord.id);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Enable 2FA for admin
    const admin = await adminAccountQueries.update(adminId, {
      twoFactorEnabled: true,
      backupCodes: hashedBackupCodes,
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 }
      );
    }

    // Create session and token
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const token = sign(
      { 
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name,
        sessionId,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get client information
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create session record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const now = new Date();

    await adminSessionQueries.create({
      id: sessionId,
      adminId: admin.id,
      sessionToken: sessionId,
      ipAddress: ip,
      userAgent: userAgent,
      expiresAt: expiresAt,
      lastActivity: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log 2FA setup
    await auditLogQueries.create({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'create',
      resource: '2fa_setup',
      resourceId: admin.id.toString(),
      ipAddress: ip,
      userAgent: userAgent,
      status: 'success',
      details: { 
        email: admin.email,
      }
    });

    return NextResponse.json({
      success: true,
      token,
      backupCodes, // Return plain backup codes for user to save
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Verify 2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
