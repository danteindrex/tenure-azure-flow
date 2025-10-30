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
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { notificationId, userId } = req.query;

    if (!notificationId || !userId) {
      return res.status(400).json({ error: 'Notification ID and User ID are required' });
    }

    await db.delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId as string),
          eq(notifications.userId, userId as string)
        )
      );

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
