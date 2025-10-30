import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from "@/drizzle/db";
import { pgTable, uuid, text, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

// Define notifications table inline
const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  priority: varchar('priority', { length: 20 }).default('medium'),
  actionUrl: text('action_url'),
  actionText: varchar('action_text', { length: 100 }),
  metadata: jsonb('metadata').default({}),
  isRead: boolean('is_read').default(false),
  isArchived: boolean('is_archived').default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const data = await db.select({
      type: notifications.type,
      priority: notifications.priority,
      isRead: notifications.isRead,
      isArchived: notifications.isArchived
    })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId as string),
          eq(notifications.isArchived, false)
        )
      );

    const notificationsList = data || [];
    const counts = {
      total: notificationsList.length,
      unread: notificationsList.filter(n => !n.isRead).length,
      high_priority: notificationsList.filter(n => n.priority === 'high' || n.priority === 'urgent').length,
      by_type: notificationsList.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return res.status(200).json(counts);
  } catch (err: any) {
    console.error('Notification counts error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
