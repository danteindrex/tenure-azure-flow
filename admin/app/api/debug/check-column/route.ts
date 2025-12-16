import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    console.log('Checking if member_eligibility_status_id column exists...');
    
    // Try to select the column to see if it exists
    const { data: testData, error: testError } = await supabaseAdmin
      .from('user_memberships')
      .select('id, member_eligibility_status_id')
      .limit(1);

    if (testError) {
      console.log('Column does not exist or has error:', testError);
      return NextResponse.json({
        columnExists: false,
        error: testError,
        message: 'Column member_eligibility_status_id does not exist'
      });
    }

    console.log('Column exists, sample data:', testData);
    return NextResponse.json({
      columnExists: true,
      sampleData: testData,
      message: 'Column member_eligibility_status_id exists'
    });

  } catch (error: any) {
    console.error('Error checking column:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check column',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}