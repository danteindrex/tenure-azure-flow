import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  try {
    console.log('Adding member_eligibility_status_id column...');
    
    const sql = `
      -- Add member_eligibility_status_id column to user_memberships table if it doesn't exist
      ALTER TABLE user_memberships 
      ADD COLUMN IF NOT EXISTS member_eligibility_status_id INTEGER 
      REFERENCES member_eligibility_statuses(id) DEFAULT 1;

      -- Update existing records to have a default status (Inactive = 1)
      UPDATE user_memberships 
      SET member_eligibility_status_id = 1 
      WHERE member_eligibility_status_id IS NULL;
    `;

    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }

    console.log('Column added successfully');

    // Test by fetching a sample record
    const { data: sampleRecord, error: fetchError } = await supabaseAdmin
      .from('user_memberships')
      .select('id, member_eligibility_status_id')
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Column added successfully',
      sampleRecord: sampleRecord,
      fetchError: fetchError
    });

  } catch (error: any) {
    console.error('Error adding column:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add column',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}