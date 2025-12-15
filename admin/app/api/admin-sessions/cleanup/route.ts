import { NextResponse } from 'next/server';
import { adminSessionQueries } from '@/lib/db/queries';

// POST - Clean up expired sessions
export async function POST() {
  try {
    // Delete expired sessions
    await adminSessionQueries.deleteExpired();

    return NextResponse.json({ success: true, message: 'Expired sessions cleaned up' });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return NextResponse.json({ error: 'Failed to cleanup sessions' }, { status: 500 });
  }
}
