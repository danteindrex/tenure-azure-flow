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
  if (req.method === 'POST') {
    // Mark notification as read
    const { notificationId, userId } = req.body;

    if (!notificationId || !userId) {
      return res.status(400).json({ error: 'Notification ID and User ID are required' });
    }

    try {
      await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Mark notification as read error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  if (req.method === 'PUT') {
    // Mark all notifications as read
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Mark all notifications as read error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  res.setHeader('Allow', ['POST', 'PUT']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
