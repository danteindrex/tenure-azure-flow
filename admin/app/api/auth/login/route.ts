import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generate5DigitCode, hashCode, getCodeExpiration } from '@/lib/utils/2fa';
import { send2FAEmail } from '@/lib/utils/send-email';
import { adminAccountQueries, twoFactorAuthQueries, auditLogQueries } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query admin table for user
    const admin = await adminAccountQueries.findByEmail(email);

    if (!admin) {
      // Get user agent for logging
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      
      // Log failed login attempt
      await auditLogQueries.create({
        adminEmail: email,
        action: 'login',
        resource: 'admin_account',
        details: { reason: 'Invalid email or password' },
        ipAddress,
        userAgent,
        status: 'failed',
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (admin.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password using hash and salt
    let passwordMatch = false;
    if (admin.hash && admin.salt) {
      const hashedPassword = await bcrypt.hash(password, admin.salt);
      passwordMatch = hashedPassword === admin.hash;
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate 5-digit login code
    const loginCode = generate5DigitCode();
    const codeHash = hashCode(loginCode);
    const expiresAt = getCodeExpiration(10); // 10 minutes

    // Store the code in database
    try {
      await twoFactorAuthQueries.create({
        adminId: admin.id,
        code: codeHash,
        expiresAt,
        used: false,
        attempts: 0,
      } as any);
    } catch (error) {
      console.error('Error storing 2FA code:', error);
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    // Send code via email
    const emailResult = await send2FAEmail(admin.email, loginCode, 'login');
    
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    // Return success with admin ID (don't create session yet)
    return NextResponse.json({
      success: true,
      requiresVerification: true,
      adminId: admin.id,
      email: admin.email,
      message: 'Verification code sent to your email'
    });


  } catch (error) {
    console.error('Login error:', error);
    
    // Log error
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    await auditLogQueries.create({
      action: 'login',
      resource: 'admin_account',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      ipAddress,
      userAgent,
      status: 'failed',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}