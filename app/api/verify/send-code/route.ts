import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { verificationCodes } from '@/drizzle/schema/verification';
import { twilioService } from '@/lib/twilio';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, countryCode = '+1' } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Check if Twilio is configured
    if (!twilioService.isConfigured()) {
      return NextResponse.json({
        error: 'SMS service not configured. Please contact support.',
        code: 'TWILIO_NOT_CONFIGURED'
      }, { status: 503 });
    }

    // Format phone number
    const formattedPhone = twilioService.formatPhoneNumber(phone, countryCode);

    // Generate 6-digit code
    const code = twilioService.generateVerificationCode();

    // Check for existing unexpired code
    const existingCode = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.userId, session.user.id),
        eq(verificationCodes.phone, formattedPhone),
        eq(verificationCodes.verified, false),
        gt(verificationCodes.expiresAt, new Date())
      )
    });

    // If there's an existing code, delete it
    if (existingCode) {
      await db.delete(verificationCodes)
        .where(eq(verificationCodes.id, existingCode.id));
    }

    // Store verification code in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(verificationCodes).values({
      userId: session.user.id,
      phone: formattedPhone,
      code,
      verified: false,
      expiresAt
    });

    // Send SMS via Twilio
    const result = await twilioService.sendVerificationCode(formattedPhone, code);

    if (!result.success) {
      // Delete the code if sending failed
      await db.delete(verificationCodes)
        .where(and(
          eq(verificationCodes.userId, session.user.id),
          eq(verificationCodes.phone, formattedPhone),
          eq(verificationCodes.code, code)
        ));

      return NextResponse.json({
        error: result.error || 'Failed to send verification code',
        code: 'SMS_SEND_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('Send code error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send verification code'
    }, { status: 500 });
  }
}
