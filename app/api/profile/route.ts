import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { users, userProfiles, userContacts, userAddresses, userMemberships } from '@/drizzle/schema/users'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile data
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        profiles: true,
        contacts: true,
        addresses: true,
        memberships: true
      }
    })

    return NextResponse.json({ profile: userProfile })
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

    // Get the user's database ID (not the auth user ID)
    const userRecord = await db.query.users.findFirst({
      where: eq(users.authUserId, session.user.id)
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 })
    }

    const userId = userRecord.id

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
          })
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
        })
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
            })
            .where(eq(userContacts.id, contact.id))
        } else {
          // Create new contact
          await db.insert(userContacts).values({
            userId: userId,
            contactType: contact.contactType,
            contactValue: contact.contactValue,
            isPrimary: contact.isPrimary ?? false,
            isVerified: contact.isVerified ?? false,
          })
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
            })
            .where(eq(userAddresses.id, address.id))
        } else {
          // Create new address
          await db.insert(userAddresses).values({
            userId: userId,
            addressType: address.addressType ?? 'primary',
            streetAddress: address.streetAddress ?? null,
            addressLine2: address.addressLine2 ?? null,
            city: address.city ?? null,
            state: address.state ?? null,
            postalCode: address.postalCode ?? null,
            countryCode: address.countryCode ?? 'US',
            isPrimary: address.isPrimary ?? false,
          })
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
  // Alias for POST
  return POST(req)
}