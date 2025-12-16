import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '@/lib/db/queries';
import { db } from '@/lib/db';
import { membershipQueue, billingSchedules, userContacts, userAddresses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    // Fetch users with filters
    const usersRaw = await userQueries.getAll(limit, offset, {
      status: status || undefined,
      search: search || undefined,
    });

    // Get total count for pagination
    const stats = await userQueries.getStats();
    const total = stats.total;

    // Map to the shape expected by the UI with payment info
    const users = await Promise.all(usersRaw.map(async (u) => {
      let paymentData = {
        last_monthly_payment: null,
        next_monthly_payment: null,
        last_annual_payment: null,
        next_annual_payment: null,
        monthly_amount: null,
        annual_amount: null,
        queue_position: null,
        queue_status: null,
      };

      try {
        // Get user's billing schedules from user_billing_schedules table
        const userBillingSchedules = await db
          .select()
          .from(billingSchedules)
          .where(eq(billingSchedules.userId, u.id))
          .orderBy(desc(billingSchedules.createdAt));

        // Filter by billing cycle (case-insensitive)
        const monthlySchedules = userBillingSchedules.filter(s => 
          s.billingCycle?.toLowerCase() === 'monthly'
        );
        const yearlySchedules = userBillingSchedules.filter(s => {
          const cycle = s.billingCycle?.toLowerCase();
          return cycle === 'yearly' || cycle === 'annual';
        });

        // Get the most recent monthly schedule
        const lastMonthlySchedule = monthlySchedules.find(s => s.createdAt);
        // Get active monthly schedule with next billing date
        const nextMonthlySchedule = monthlySchedules.find(s => s.isActive && s.nextBillingDate);

        // Get the most recent yearly schedule
        const lastYearlySchedule = yearlySchedules.find(s => s.createdAt);
        // Get active yearly schedule with next billing date
        const nextYearlySchedule = yearlySchedules.find(s => s.isActive && s.nextBillingDate);

        paymentData = {
          last_monthly_payment: lastMonthlySchedule?.createdAt || null,
          next_monthly_payment: nextMonthlySchedule?.nextBillingDate || null,
          last_annual_payment: lastYearlySchedule?.createdAt || null,
          next_annual_payment: nextYearlySchedule?.nextBillingDate || null,
          monthly_amount: lastMonthlySchedule?.amount || null,
          annual_amount: lastYearlySchedule?.amount || null,
          queue_position: null,
          queue_status: null,
        };
      } catch (err) {
        console.error(`Error fetching billing schedule data for user ${u.id}:`, err);
      }

      try {
        // Get queue position - separate try/catch in case table doesn't exist
        const queueEntry = await db
          .select()
          .from(membershipQueue)
          .where(eq(membershipQueue.userId, u.id))
          .limit(1);

        if (queueEntry && queueEntry.length > 0) {
          paymentData.queue_position = queueEntry[0].position || null;
          paymentData.queue_status = queueEntry[0].status || null;
        }
      } catch (err) {
        // Silently fail if membership_queue table doesn't exist or has issues
        console.error(`Error fetching queue data for user ${u.id}:`, err);
      }

      // Get user's phone number from user_contacts table
      let phoneNumber = null;
      try {
        const contacts = await db
          .select()
          .from(userContacts)
          .where(eq(userContacts.userId, u.id));

        // Find primary phone or first phone contact
        const primaryPhone = contacts.find(c => c.contactType === 'phone' && c.isPrimary);
        const anyPhone = contacts.find(c => c.contactType === 'phone');
        phoneNumber = primaryPhone?.contactValue || anyPhone?.contactValue || null;
      } catch (err) {
        console.error(`Error fetching contacts for user ${u.id}:`, err);
      }

      // Get user's address from user_addresses table
      let userAddress = null;
      try {
        const addresses = await db
          .select()
          .from(userAddresses)
          .where(eq(userAddresses.userId, u.id));

        // Find primary address or first address
        const primaryAddress = addresses.find(a => a.isPrimary);
        const anyAddress = addresses[0];
        const selectedAddress = primaryAddress || anyAddress;
        
        if (selectedAddress) {
          userAddress = [
            selectedAddress.streetAddress,
            selectedAddress.addressLine2,
            selectedAddress.city,
            selectedAddress.state,
            selectedAddress.postalCode,
            selectedAddress.countryCode
          ].filter(Boolean).join(', ');
        }
      } catch (err) {
        console.error(`Error fetching addresses for user ${u.id}:`, err);
      }

      return {
        id: u.id,
        email: u.email,
        name: u.name || '',
        role: null,
        status: u.status,
        membership_type: null,
        joined_at: u.createdAt,
        last_active: u.updatedAt,
        avatar: u.image,
        image: u.image,
        phone: phoneNumber,
        address: userAddress,
        email_verified: u.emailVerified || false,
        two_factor_enabled: u.twoFactorEnabled || false,
        created_at: u.createdAt,
        updated_at: u.updatedAt,
        ...paymentData,
      };
    }));

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, status = 'pending' } = body;

    const newUser = await userQueries.create({
      email,
      name,
      status: status as any,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}