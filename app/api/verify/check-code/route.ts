import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { verificationCodes } from '@/drizzle/schema/verification';
import { userContacts } from '@/drizzle/schema/users';
import { users } from '@/drizzle/schema/users';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({
        error: 'Phone number and code are required'
      }, { status: 400 });
    }

    // Find verification code
    const verification = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.userId, session.user.id),
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.code, code),
        eq(verificationCodes.verified, false),
        gt(verificationCodes.expiresAt, new Date())
      )
    });

    if (!verification) {
      return NextResponse.json({
        error: 'Invalid or expired verification code',
        code: 'INVALID_CODE'
      }, { status: 400 });
    }

    // Mark code as verified
    await db.update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, verification.id));

    // Update phone in Better Auth user table
    await auth.api.updateUser({
      userId: session.user.id,
      phone,
      phoneVerified: true
    });

    // Find the normalized user record linked to Better Auth
    const userRecord = await db.query.users.findFirst({
      where: eq(users.userId, session.user.id)
    });

    if (userRecord) {
      const normalizedUserId = userRecord.id;

      // Check if phone contact exists
      const existingPhone = await db.query.userContacts.findFirst({
        where: and(
          eq(userContacts.userId, normalizedUserId),
          eq(userContacts.contactType, 'phone'),
          eq(userContacts.isPrimary, true)
        )
      });

      if (existingPhone) {
        // Update existing phone contact to verified
        await db.update(userContacts)
          .set({
            contactValue: phone,
            isVerified: true,
            updatedAt: new Date()
          })
          .where(eq(userContacts.id, existingPhone.id));
      } else {
        // Create new phone contact
        await db.insert(userContacts).values({
          userId: normalizedUserId,
          contactType: 'phone',
          contactValue: phone,
          isPrimary: true,
          isVerified: true
        });
      }
    }

    // Clean up old verification codes for this user and phone
    await db.delete(verificationCodes)
      .where(and(
        eq(verificationCodes.userId, session.user.id),
        eq(verificationCodes.phone, phone)
      ));

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Phone number verified successfully'
    });

  } catch (error: any) {
    console.error('Verify code error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to verify code'
    }, { status: 500 });
  }
}
