import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from "@/drizzle/db";
import { pgTable, uuid, text, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { eq, and, desc, sql } from "drizzle-orm";

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
  if (req.method === 'GET') {
    // Get user's notifications
    const { userId, limit, offset, type, is_read, is_archived } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      // Build where conditions
      const conditions: any[] = [eq(notifications.userId, userId as string)];

      if (type) {
        conditions.push(eq(notifications.type, type as string));
      }

      if (is_read !== undefined) {
        conditions.push(eq(notifications.isRead, is_read === 'true'));
      }

      if (is_archived !== undefined) {
        conditions.push(eq(notifications.isArchived, is_archived === 'true'));
      }

      const limitNum = limit ? parseInt(limit as string) : 50;
      const offsetNum = offset ? parseInt(offset as string) : 0;

      const data = await db.select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      return res.status(200).json({ notifications: data || [] });
    } catch (err: any) {
      console.error('Notifications error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  if (req.method === 'POST') {
    // Create new notification
    const { userId, type, title, message, priority, action_url, action_text, metadata } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const result = await db.insert(notifications)
        .values({
          userId,
          type,
          title,
          message,
          priority: priority || 'medium',
          actionUrl: action_url,
          actionText: action_text,
          metadata: metadata || {}
        })
        .returning();

      return res.status(201).json({ notification: result[0] });
    } catch (err: any) {
      console.error('Create notification error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
