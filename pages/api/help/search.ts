import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from "@/drizzle/db";
import { pgTable, uuid, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { eq, or, ilike, and, sql } from "drizzle-orm";

// Define FAQ and knowledge base tables inline
const faqCategories = pgTable('faq_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

const faqItems = pgTable('faq_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => faqCategories.id),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  isActive: boolean('is_active').default(true),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

const knowledgeBaseArticles = pgTable('knowledge_base_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  isPublished: boolean('is_published').default(false),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

const helpSearchLogs = pgTable('help_search_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  searchQuery: varchar('search_query', { length: 255 }).notNull(),
  resultsCount: integer('results_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { q: searchQuery, userId } = req.query;

    if (!searchQuery || typeof searchQuery !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchPattern = `%${searchQuery}%`;

    // Search FAQ items
    let faqItemsResult: any[] = [];
    try {
      faqItemsResult = await db.select({
        id: faqItems.id,
        question: faqItems.question,
        answer: faqItems.answer,
        helpfulCount: faqItems.helpfulCount,
        categoryId: faqItems.categoryId,
        category: {
          id: faqCategories.id,
          name: faqCategories.name,
          icon: faqCategories.icon
        }
      })
        .from(faqItems)
        .leftJoin(faqCategories, eq(faqItems.categoryId, faqCategories.id))
        .where(
          and(
            eq(faqItems.isActive, true),
            or(
              ilike(faqItems.question, searchPattern),
              ilike(faqItems.answer, searchPattern)
            )
          )
        )
        .orderBy(sql`${faqItems.helpfulCount} DESC`);
    } catch (err) {
      console.error('Error searching FAQ items:', err);
    }

    // Search knowledge base articles
    let articlesResult: any[] = [];
    try {
      articlesResult = await db.select()
        .from(knowledgeBaseArticles)
        .where(
          and(
            eq(knowledgeBaseArticles.isPublished, true),
            or(
              ilike(knowledgeBaseArticles.title, searchPattern),
              ilike(knowledgeBaseArticles.content, searchPattern),
              ilike(knowledgeBaseArticles.excerpt, searchPattern)
            )
          )
        )
        .orderBy(sql`${knowledgeBaseArticles.helpfulCount} DESC`);
    } catch (err) {
      console.error('Error searching knowledge base:', err);
    }

    const totalResults = (faqItemsResult?.length || 0) + (articlesResult?.length || 0);

    // Log the search
    if (userId) {
      try {
        await db.insert(helpSearchLogs).values({
          userId: userId as string,
          searchQuery: searchQuery,
          resultsCount: totalResults
        });
      } catch (err) {
        // Don't fail the request if logging fails
        console.error('Error logging search:', err);
      }
    }

    return res.status(200).json({
      faqItems: faqItemsResult || [],
      articles: articlesResult || [],
      totalResults
    });
  } catch (err: any) {
    console.error('Help search error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
