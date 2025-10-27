import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { users, userProfiles, userContacts, userAddresses, userMemberships } from '@/drizzle/schema/users'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/profile
 * Fetch complete user profile from normalized tables
 */
export async function GET(req: NextRequest) {
  try {
    // Get current Better Auth session
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const betterAuthUserId = session.user.id

    // Find the user record that links to Better Auth
    const userRecord = await db.query.users.findFirst({
      where: eq(users.userId, betterAuthUserId),
      with: {
        profile: true,
        membership: true,
        contacts: true,
        addresses: true
      }
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Extract primary phone
    const primaryPhone = userRecord.contacts?.find(
      c => c.contactType === 'phone' && c.isPrimary
    )

    // Extract primary address
    const primaryAddress = userRecord.addresses?.find(
      a => a.isPrimary
    )

    // Build complete profile response
    const profile = {
      // From Better Auth user table
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      image: session.user.image,

      // From user_profiles table
      firstName: userRecord.profile?.firstName || '',
      lastName: userRecord.profile?.lastName || '',
      middleName: userRecord.profile?.middleName || '',
      fullName: `${userRecord.profile?.firstName || ''} ${userRecord.profile?.lastName || ''}`.trim() || session.user.name,
      dateOfBirth: userRecord.profile?.dateOfBirth || null,

      // From user_contacts table
      phone: primaryPhone?.contactValue || '',
      phoneVerified: primaryPhone?.isVerified || false,

      // From user_addresses table
      streetAddress: primaryAddress?.streetAddress || '',
      addressLine2: primaryAddress?.addressLine2 || '',
      city: primaryAddress?.city || '',
      state: primaryAddress?.state || '',
      postalCode: primaryAddress?.postalCode || '',
      countryCode: primaryAddress?.countryCode || 'US',

      // From users table
      status: userRecord.status,
      userId: userRecord.id,

      // From user_memberships table
      joinDate: userRecord.membership?.joinDate || userRecord.createdAt,
      tenure: userRecord.membership?.tenure || '0',
      verificationStatus: userRecord.membership?.verificationStatus || 'PENDING',

      // Onboarding tracking (if we add it to users table)
      onboardingStep: session.user.onboardingStep || 5,
      onboardingCompleted: session.user.onboardingCompleted || true,

      // Metadata
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt
    }

    return NextResponse.json(profile)

  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 * Update user profile in normalized tables
 */
export async function PATCH(req: NextRequest) {
  try {
    // Get current Better Auth session
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const betterAuthUserId = session.user.id
    const body = await req.json()

    // Find the user record
    const userRecord = await db.query.users.findFirst({
      where: eq(users.userId, betterAuthUserId)
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const normalizedUserId = userRecord.id

    // Update user_profiles table
    if (body.firstName || body.lastName || body.middleName || body.dateOfBirth) {
      // Check if profile exists
      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, normalizedUserId)
      })

      const profileData = {
        firstName: body.firstName,
        lastName: body.lastName,
        middleName: body.middleName,
        dateOfBirth: body.dateOfBirth,
        updatedAt: new Date()
      }

      if (existingProfile) {
        // Update existing profile
        await db.update(userProfiles)
          .set(profileData)
          .where(eq(userProfiles.userId, normalizedUserId))
      } else {
        // Create new profile
        await db.insert(userProfiles).values({
          userId: normalizedUserId,
          ...profileData
        })
      }

      // Update Better Auth user name
      const fullName = `${body.firstName || ''} ${body.lastName || ''}`.trim()
      if (fullName) {
        await auth.api.updateUser({
          userId: betterAuthUserId,
          name: fullName
        })
      }
    }

    // Update phone in user_contacts table
    if (body.phone !== undefined) {
      // Find existing primary phone
      const existingPhone = await db.query.userContacts.findFirst({
        where: and(
          eq(userContacts.userId, normalizedUserId),
          eq(userContacts.contactType, 'phone'),
          eq(userContacts.isPrimary, true)
        )
      })

      if (body.phone === '') {
        // Remove phone if empty
        if (existingPhone) {
          await db.delete(userContacts).where(eq(userContacts.id, existingPhone.id))
        }
      } else if (existingPhone) {
        // Update existing phone
        await db.update(userContacts)
          .set({
            contactValue: body.phone,
            updatedAt: new Date()
          })
          .where(eq(userContacts.id, existingPhone.id))
      } else {
        // Create new phone contact
        await db.insert(userContacts).values({
          userId: normalizedUserId,
          contactType: 'phone',
          contactValue: body.phone,
          isPrimary: true,
          isVerified: false
        })
      }
    }

    // Update address in user_addresses table
    if (body.streetAddress || body.city || body.state || body.postalCode) {
      const existingAddress = await db.query.userAddresses.findFirst({
        where: and(
          eq(userAddresses.userId, normalizedUserId),
          eq(userAddresses.isPrimary, true)
        )
      })

      const addressData = {
        streetAddress: body.streetAddress,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        countryCode: body.countryCode || 'US',
        updatedAt: new Date()
      }

      if (existingAddress) {
        // Update existing address
        await db.update(userAddresses)
          .set(addressData)
          .where(eq(userAddresses.id, existingAddress.id))
      } else {
        // Create new address
        await db.insert(userAddresses).values({
          userId: normalizedUserId,
          addressType: 'primary',
          isPrimary: true,
          ...addressData
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })

  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
