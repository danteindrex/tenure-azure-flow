import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";

// Define support_tickets table inline since it's not in the schema yet
const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 20 }).default('open'),
  userEmail: varchar('user_email', { length: 255 }),
  userName: varchar('user_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get user's support tickets
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const tickets = await db.select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, userId as string))
        .orderBy(supportTickets.createdAt);

      return res.status(200).json({ tickets: tickets || [] });
    } catch (err: any) {
      console.error('Error fetching support tickets:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  if (req.method === 'POST') {
    // Create new support ticket
    const { userId, subject, description, category, priority } = req.body;

    if (!userId || !subject || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Get current user session using Better Auth
      const session = await auth.api.getSession({
        headers: new Headers(req.headers as any)
      });

      if (!session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get user info from Better Auth session
      const userEmail = session.user.email;
      const userName = session.user.name || session.user.email?.split('@')[0];

      const result = await db.insert(supportTickets)
        .values({
          userId: userId,
          subject,
          description,
          category,
          priority: priority || 'medium',
          userEmail: userEmail,
          userName: userName
        })
        .returning();

      return res.status(201).json({ ticket: result[0] });
    } catch (err: any) {
      console.error('Create ticket error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
