import { NextResponse } from 'next/server';
import { adminAlertQueries } from '@/lib/db/queries';
import { db } from '@/lib/db';
import { adminAlerts } from '@/lib/db/schema';

// GET - Fetch all alerts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const alerts = await adminAlertQueries.getAll(limit, offset, unreadOnly);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

// POST - Create new alert
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, type = 'info', severity = 'info' } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const [alert] = await db
      .insert(adminAlerts)
      .values({
        title,
        message,
        type,
        severity,
        read: false,
      })
      .returning();

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}