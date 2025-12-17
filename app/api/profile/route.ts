import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { user, userProfiles, userContacts, userAddresses, userMemberships } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id;

    // Get user from Better Auth table
    const dbUser = await db.select().from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get profile
    const profile = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)
      .then(rows => rows[0]);

    // Get contacts
    const contacts = await db.select().from(userContacts)
      .where(eq(userContacts.userId, userId));

    // Get addresses
    const addresses = await db.select().from(userAddresses)
      .where(eq(userAddresses.userId, userId));

    // Get memberships
    const memberships = await db.select().from(userMemberships)
      .where(eq(userMemberships.userId, userId));

    return NextResponse.json({
      profile: {
        ...dbUser,
        profiles: profile ? [profile] : [],
        contacts: contacts,
        addresses: addresses,
        memberships: memberships
      }
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileData = await req.json()

    // Use the Better Auth user ID directly
    const userId = session.user.id;

    // Verify user exists in database
    const userRecord = await db.select().from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!userRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 })
    }

    // Update user profile
    if (profileData.firstName !== undefined || profileData.lastName !== undefined ||
        profileData.middleName !== undefined || profileData.dateOfBirth !== undefined) {

      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, userId)
      })

      if (existingProfile) {
        // Update existing profile
        await db.update(userProfiles)
          .set({
            firstName: profileData.firstName ?? existingProfile.firstName,
            lastName: profileData.lastName ?? existingProfile.lastName,
            middleName: profileData.middleName ?? existingProfile.middleName,
            dateOfBirth: profileData.dateOfBirth ?? existingProfile.dateOfBirth,
            updatedAt: new Date()
          } as any)
          .where(eq(userProfiles.userId, userId))
      } else {
        // Create new profile
        await db.insert(userProfiles).values({
          id: userId,
          userId: userId,
          firstName: profileData.firstName ?? null,
          lastName: profileData.lastName ?? null,
          middleName: profileData.middleName ?? null,
          dateOfBirth: profileData.dateOfBirth ?? null,
        } as any)
      }
    }

    // Update contacts if provided
    if (profileData.contacts && Array.isArray(profileData.contacts)) {
      for (const contact of profileData.contacts) {
        if (contact.id) {
          // Update existing contact
            await db.update(userContacts)
              .set({
                contactValue: contact.contactValue,
                isPrimary: contact.isPrimary ?? false,
                isVerified: contact.isVerified ?? false,
                updatedAt: new Date()
              } as any)
              .where(eq(userContacts.id, contact.id))
        } else {
          // Create new contact
          await db.insert(userContacts).values({
            userId: userId,
            contactType: contact.contactType,
            contactValue: contact.contactValue,
            isPrimary: contact.isPrimary ?? false,
            isVerified: contact.isVerified ?? false,
          } as any)
        }
      }
    }

    // Update addresses if provided
    if (profileData.addresses && Array.isArray(profileData.addresses)) {
      for (const address of profileData.addresses) {
        if (address.id) {
          // Update existing address
          await db.update(userAddresses)
            .set({
              addressType: address.addressType ?? 'primary',
              streetAddress: address.streetAddress,
              addressLine2: address.addressLine2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              countryCode: address.countryCode ?? 'US',
              isPrimary: address.isPrimary ?? false,
              updatedAt: new Date()
            } as any)
            .where(eq(userAddresses.id, address.id))
        } else {
          // Create new address - validate required fields
          if (!address.streetAddress || !address.city || !address.state || !address.postalCode) {
            return NextResponse.json(
              { success: false, error: 'Address must include street address, city, state, and postal code' },
              { status: 400 }
            )
          }

          await db.insert(userAddresses).values({
            userId: userId,
            addressType: address.addressType ?? 'primary',
            streetAddress: address.streetAddress,
            addressLine2: address.addressLine2 ?? null,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            countryCode: address.countryCode ?? 'US',
            isPrimary: address.isPrimary ?? false,
          } as any)
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  // Temporarily disabled due to schema type issues
  return NextResponse.json({
    success: false,
    error: 'Profile updates temporarily disabled due to schema migration'
  }, { status: 503 });
}

/*
export async function PUT_ORIGINAL(req: NextRequest) {
  // Alias for POST
  return POST(req)
}
*/