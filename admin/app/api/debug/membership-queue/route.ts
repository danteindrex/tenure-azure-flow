import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { membershipQueue } from '@/lib/db/schema';

export async function GET() {
  try {
    console.log('Testing membership queue database connection...');
    
    // Try to fetch all members from the membership_queue table
    const members = await db
      .select()
      .from(membershipQueue)
      .limit(5);

    console.log('Found members:', members);

    return NextResponse.json({
      success: true,
      count: members.length,
      members: members,
      message: 'Database connection successful'
    });

  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error?.message || 'Unknown error',
        stack: error?.stack
      },
      { status: 500 }
    );
  }
}