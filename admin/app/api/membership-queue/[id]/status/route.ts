import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    
    console.log('Updating member status:', { memberId: params.id, newStatus: status });
    
    // Validate status
    const validStatuses = ['Inactive', 'Active', 'Suspended', 'Cancelled', 'Won', 'Paid'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Find the membership record in user_memberships table
    console.log('Looking for membership with ID:', params.id);
    
    // Try to find membership by id first
    let { data: currentMembership, error: findError } = await supabaseAdmin
      .from('user_memberships')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          user_status_id
        )
      `)
      .eq('id', params.id)
      .single();

    // If not found by membership id, try by user_id as fallback
    if (findError || !currentMembership) {
      console.log('Membership not found by id, trying user_id...');
      const { data: membershipByUserId, error: userIdError } = await supabaseAdmin
        .from('user_memberships')
        .select(`
          *,
          users!inner(
            id,
            name,
            email,
            user_status_id
          )
        `)
        .eq('user_id', params.id)
        .single();
      
      if (!userIdError && membershipByUserId) {
        currentMembership = membershipByUserId;
        findError = null;
      }
    }

    if (findError || !currentMembership) {
      console.log('Membership not found, error:', findError);
      return NextResponse.json(
        { 
          error: 'Membership not found',
          searchedId: params.id,
          message: `No membership found with ID: ${params.id}`,
          details: findError?.message
        },
        { status: 404 }
      );
    }

    console.log('Found membership:', currentMembership);

    // Get current status from member_eligibility_statuses
    const { data: currentStatusData } = await supabaseAdmin
      .from('member_eligibility_statuses')
      .select('name')
      .eq('id', currentMembership.member_eligibility_status_id || 1)
      .single();

    const oldStatus = currentStatusData?.name || 'Unknown';

    console.log('Updating member eligibility status from', oldStatus, 'to', status);

    // Get the status ID for the new status from member_eligibility_statuses
    const { data: newStatusData, error: statusError } = await supabaseAdmin
      .from('member_eligibility_statuses')
      .select('id')
      .eq('name', status)
      .single();

    if (statusError || !newStatusData) {
      console.log('Status not found in lookup table:', statusError);
      return NextResponse.json(
        { 
          error: `Status '${status}' not found in member_eligibility_statuses table`,
          details: statusError?.message
        },
        { status: 400 }
      );
    }

    const statusId = newStatusData.id;
    console.log('Mapping status', status, 'to ID', statusId);

    // Update both member_eligibility_status_id and member_status_id
    const { data: updatedMembership, error: updateError } = await supabaseAdmin
      .from('user_memberships')
      .update({ 
        member_eligibility_status_id: statusId,
        member_status_id: statusId, // Update both columns with the same status ID
        updated_at: new Date().toISOString()
      })
      .eq('id', currentMembership.id)
      .select()
      .single();

    console.log('Update result:', updatedMembership);
    console.log('Update error:', updateError);

    if (updateError || !updatedMembership) {
      return NextResponse.json(
        { 
          error: 'Failed to update member eligibility status',
          details: updateError?.message || 'No data returned'
        },
        { status: 500 }
      );
    }

    // Create audit log entry (optional, skip if it fails)
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'update',
          resource: 'user_memberships',
          resource_id: currentMembership.id,
          details: {
            fields: ['member_eligibility_status_id', 'member_status_id'],
            oldValue: oldStatus,
            newValue: status,
            userId: currentMembership.user_id
          },
          admin_email: 'system', // TODO: Get from session when auth is implemented
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      member: updatedMembership,
      message: `Member status updated from ${oldStatus} to ${status} (both eligibility and member status columns)`
    });

  } catch (error: any) {
    console.error('Error updating member status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update member status',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}