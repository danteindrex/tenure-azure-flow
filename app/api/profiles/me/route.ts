import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { user, userProfiles, userContacts, userAddresses } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get Better Auth user
    const dbUser = await db.select().from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      return NextResponse.json({
        error: "User not found in database",
        details: "User not found in Better Auth table"
      }, { status: 404 });
    }

    // Get profile
    const profile = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)
      .then(rows => rows[0]);

    // Get phone contact
    const phoneContact = await db.select().from(userContacts)
      .where(and(
        eq(userContacts.userId, userId),
        eq(userContacts.contactType, 'phone')
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Get primary address
    const address = await db.select().from(userAddresses)
      .where(and(
        eq(userAddresses.userId, userId),
        eq(userAddresses.isPrimary, true)
      ))
      .limit(1)
      .then(rows => rows[0]);

    // Extract phone parts if exists - use stored country_code column
    let phoneData = null;
    if (phoneContact) {
      const fullNumber = phoneContact.contactValue || '';
      // Use stored country code from database (set during signup)
      const countryCode = phoneContact.countryCode || '+1';
      // Remove the country code from the full number to get just the local number
      const number = fullNumber.startsWith(countryCode)
        ? fullNumber.slice(countryCode.length)
        : fullNumber;

      phoneData = {
        countryCode,
        number,
        isVerified: phoneContact.isVerified,
        fullNumber
      };
    }

    // Return data in both formats for compatibility
    // Flat format for ProfileTab.tsx and nested format for Profile.tsx
    return NextResponse.json({
      success: true,
      // Flat format (used by ProfileTab.tsx)
      phone: phoneData ? phoneData.number : "",
      street_address: address?.streetAddress || "",
      city: address?.city || "",
      state: address?.state || "",
      zip_code: address?.postalCode || "",
      // Nested format (used by Profile.tsx)
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
