import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { hashCode, isValid5DigitCodeFormat } from '@/lib/utils/2fa';
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
    if (!isValid5DigitCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    // Get the most recent unused code for this admin
    const codeRecord = await twoFactorAuthQueries.findLatestByAdminId(adminId);

    if (!codeRecord) {
      console.error('No unused code found for admin:', adminId);
      return NextResponse.json(
        { error: 'No verification code found. Please log in again.' },
        { status: 401 }
      );
    }

    // Check if code is expired
    if (new Date() > new Date(codeRecord.expiresAt)) {
      console.error('Code expired for admin:', adminId, 'Expired at:', codeRecord.expiresAt);
      return NextResponse.json(
        { error: 'Verification code has expired. Please log in again.' },
        { status: 401 }
      );
    }

    // Check attempts
    if (codeRecord.attempts >= 3) {
      console.error('Too many attempts for admin:', adminId);
      return NextResponse.json(
        { error: 'Too many attempts. Please log in again to get a new code.' },
        { status: 429 }
      );
    }

    // Verify code
    const codeHash = hashCode(code);
    console.log('Verifying code for admin:', adminId);
    console.log('Code entered:', code);
    console.log('Hash generated:', codeHash);
    console.log('Hash in DB:', codeRecord.code);
    console.log('Match:', codeHash === codeRecord.code);
    
    if (codeHash !== codeRecord.code) {
      // Increment attempts
      const newAttempts = (codeRecord.attempts || 0) + 1;
      await db
        .update(twoFactorAuth)
        .set({ attempts: newAttempts })
        .where(eq(twoFactorAuth.id, codeRecord.id));

      console.error('Invalid code attempt', newAttempts, 'for admin:', adminId);
      return NextResponse.json(
        { error: `Invalid code. ${3 - newAttempts} attempts remaining.` },
        { status: 401 }
      );
    }

    // Mark code as used
    await twoFactorAuthQueries.markAsUsed(codeRecord.id);

    // Get admin details
    const admin = await adminAccountQueries.findById(adminId);

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Check if 2FA is enabled
    if (!admin.twoFactorEnabled) {
      // Redirect to 2FA setup
      return NextResponse.json({
        success: true,
        requires2FASetup: true,
        adminId: admin.id,
        email: admin.email,
      });
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

    // Log successful login
    await auditLogQueries.create({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'login',
      resource: 'admin',
      resourceId: admin.id.toString(),
      ipAddress: ip,
      userAgent: userAgent,
      status: 'success',
      details: { 
        email: admin.email,
        sessionId: sessionId,
      }
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Verify login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
