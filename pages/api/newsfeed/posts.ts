import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { newsfeedPosts } from "@/drizzle/schema/content";
import { eq, lte, desc, and } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await auth.api.getSession({ headers: new Headers(req.headers as any) });
    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const q = req.query as Record<string, string>;
    const limit = parseInt(q.limit || "10", 10);
    const page = parseInt(q.page || "1", 10);
    const offset = (page - 1) * limit;

    // Query newsfeed posts using Drizzle ORM
    const posts = await db.select({
      id: newsfeedPosts.id,
      title: newsfeedPosts.title,
      content: newsfeedPosts.content,
      publish_date: newsfeedPosts.publishDate,
      status: newsfeedPosts.status,
      priority: newsfeedPosts.priority,
      created_at: newsfeedPosts.createdAt,
      updated_at: newsfeedPosts.updatedAt,
    })
      .from(newsfeedPosts)
      .where(
        and(
          eq(newsfeedPosts.status, 'Published'),
          lte(newsfeedPosts.publishDate, new Date())
        )
      )
      .orderBy(desc(newsfeedPosts.publishDate))
      .limit(limit)
      .offset(offset);

    return res.status(200).json({ posts });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    console.error('Newsfeed API error:', errorMessage);
    return res.status(500).json({ error: "Failed to fetch newsfeed posts" });
  }
}