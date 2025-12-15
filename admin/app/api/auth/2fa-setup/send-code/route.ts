import { NextResponse } from 'next/server';
import { generate2FACode, hashCode, getCodeExpiration } from '@/lib/utils/2fa';
import { send2FAEmail } from '@/lib/utils/send-email';
import { adminAccountQueries, twoFactorAuthQueries } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const { adminId } = await request.json();

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // Get admin details
    const admin = await adminAccountQueries.findById(adminId);

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Generate 6-digit setup code
    const setupCode = generate2FACode();
    const codeHash = hashCode(setupCode);
    const expiresAt = getCodeExpiration(10); // 10 minutes

    // Store the code
    await twoFactorAuthQueries.create({
      adminId: adminId,
      code: codeHash,
      expiresAt: expiresAt,
      used: false,
      attempts: 0,
    });

    // Send code via email
    const emailResult = await send2FAEmail(admin.email, setupCode, 'setup');
    
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '6-digit verification code sent to your email'
    });
  } catch (error) {
    console.error('Send 2FA setup code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
