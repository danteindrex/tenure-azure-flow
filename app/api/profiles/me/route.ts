import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users, userProfiles, userContacts, userAddresses } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get database user
    const dbUser = await db.select().from(users)
      .where(eq(users.authUserId, session.user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      return NextResponse.json({
        error: "User not found in database",
        details: "User exists in auth but not in users table"
      }, { status: 404 });
    }

    // Get profile
    const profile = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, dbUser.id))
      .limit(1)
      .then(rows => rows[0]);

    // Get phone contact
    const phoneContact = await db.select().from(userContacts)
      .where(and(
        eq(userContacts.userId, dbUser.id),
        eq(userContacts.contactType, 'phone')
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Get primary address
    const address = await db.select().from(userAddresses)
      .where(and(
        eq(userAddresses.userId, dbUser.id),
        eq(userAddresses.isPrimary, true)
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Extract phone parts if exists
    let phoneData = null;
    if (phoneContact) {
      // Assume format: +1234567890 or just phone number
      const phoneValue = phoneContact.contactValue || '';
      const countryCodeMatch = phoneValue.match(/^\+(\d{1,3})/);
      const countryCode = countryCodeMatch ? `+${countryCodeMatch[1]}` : '+1';
      const number = phoneValue.replace(/^\+\d{1,3}/, '');

      phoneData = {
        countryCode,
        number,
        isVerified: phoneContact.isVerified,
        fullNumber: phoneValue
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        email: dbUser.email,
        profile: profile || {
          firstName: '',
          lastName: '',
          middleName: '',
          dateOfBirth: null
        },
        phone: phoneData,
        address: address || {
          streetAddress: '',
          addressLine2: '',
          city: '',
          state: '',
          postalCode: '',
          countryCode: 'US'
        }
      }
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
