import { NextResponse } from 'next/server';
import { adminAlertQueries } from '@/lib/db/queries';
import { db } from '@/lib/db';
import { adminAlerts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PUT - Update alert (mark as read)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { readBy } = body;

    if (readBy) {
      await adminAlertQueries.markAsRead(params.id, readBy);
    }

    const [alert] = await db
      .select()
      .from(adminAlerts)
      .where(eq(adminAlerts.id, params.id))
      .limit(1);

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

// DELETE - Delete alert
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await adminAlertQueries.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}