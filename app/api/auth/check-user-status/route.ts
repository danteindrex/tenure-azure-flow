import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { userMemberships } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { VERIFICATION_STATUS } from "@/lib/status-ids";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user has completed KYC verification
    const membership = await db.select().from(userMemberships)
      .where(eq(userMemberships.userId, session.user.id))
      .limit(1)
      .then(rows => rows[0]);

    // User is considered verified if their membership verification_status_id is VERIFIED (2)
    const isVerified = membership?.verificationStatusId === VERIFICATION_STATUS.VERIFIED;

    return NextResponse.json({
      isVerified,
      userId: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified || false,
      verificationStatusId: membership?.verificationStatusId || VERIFICATION_STATUS.PENDING
    });

  } catch (error) {
    console.error('Error checking user verification status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // TODO: Implement user lookup with Drizzle ORM
    // For now, return basic response
    return NextResponse.json({
      userExists: false,
      needsEmailVerification: true,
    });

  } catch (error) {
    console.error('Check user status error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unexpected error'
    }, { status: 500 });
  }
}
