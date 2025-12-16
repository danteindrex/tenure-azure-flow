import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import { membershipQueue, billingSchedules, userContacts, userAddresses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

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
        .where(eq(billingSchedules.userId, params.id))
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
        ...paymentData,
        last_monthly_payment: lastMonthlySchedule?.createdAt || null,
        next_monthly_payment: nextMonthlySchedule?.nextBillingDate || null,
        last_annual_payment: lastYearlySchedule?.createdAt || null,
        next_annual_payment: nextYearlySchedule?.nextBillingDate || null,
        monthly_amount: lastMonthlySchedule?.amount || null,
        annual_amount: lastYearlySchedule?.amount || null,
      };
    } catch (err) {
      console.error(`Error fetching billing schedule data for user ${params.id}:`, err);
    }

    try {
      // Get queue position - separate try/catch in case table doesn't exist
      const queueEntry = await db
        .select()
        .from(membershipQueue)
        .where(eq(membershipQueue.userId, params.id))
        .limit(1);

      if (queueEntry && queueEntry.length > 0) {
        paymentData.queue_position = queueEntry[0].position || null;
        paymentData.queue_status = queueEntry[0].status || null;
      }
    } catch (err) {
      // Silently fail if membership_queue table doesn't exist or has issues
      console.error(`Error fetching queue data for user ${params.id}:`, err);
    }

    // Get user's phone number from user_contacts table
    let phoneNumber = null;
    try {
      const contacts = await db
        .select()
        .from(userContacts)
        .where(eq(userContacts.userId, params.id));

      // Find primary phone or first phone contact
      const primaryPhone = contacts.find(c => c.contactType === 'phone' && c.isPrimary);
      const anyPhone = contacts.find(c => c.contactType === 'phone');
      phoneNumber = primaryPhone?.contactValue || anyPhone?.contactValue || null;
    } catch (err) {
      console.error(`Error fetching contacts for user ${params.id}:`, err);
    }

    // Get user's address from user_addresses table
    let userAddress = null;
    try {
      const addresses = await db
        .select()
        .from(userAddresses)
        .where(eq(userAddresses.userId, params.id));

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
      console.error(`Error fetching addresses for user ${params.id}:`, err);
    }

    const enrichedUser = {
      ...user,
      phone: phoneNumber,
      address: userAddress,
      ...paymentData,
    };

    return NextResponse.json(enrichedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, status, avatar } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (avatar !== undefined) updateData.image = avatar;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error || !updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}