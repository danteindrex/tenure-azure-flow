import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await auth.api.getSession({ headers: new Headers(req.headers as any) });
    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const adminUrl = process.env.ADMIN_SERVICE_URL || "http://localhost:3003";
    const q = req.query as Record<string, string>;
    const limit = parseInt(q.limit || "10", 10);
    const page = parseInt(q.page || "1", 10);

    const query = `
      query GetNews($where: newsfeedpost_where, $limit: Int, $page: Int) {
        newsfeedposts(where: $where, limit: $limit, page: $page, sort: "-publish_date") {
          docs {
            id
            title
            content
            publish_date
            status
            priority
            createdAt
            updatedAt
          }
          totalDocs
          totalPages
          page
          hasNextPage
          hasPrevPage
        }
      }
    `;

    const variables = {
      where: {
        status: { equals: "Published" },
        publish_date: { less_than_equal: new Date().toISOString() }
      },
      limit,
      page
    };

    let posts: any[] = [];

    try {
      const gqlRes = await fetch(`${adminUrl}/api/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables })
      });

      if (gqlRes.ok) {
        const gqlJson = await gqlRes.json();
        
        // Check for GraphQL errors
        if (gqlJson.errors && gqlJson.errors.length > 0) {
          console.error('GraphQL errors:', gqlJson.errors);
          throw new Error(`GraphQL error: ${gqlJson.errors[0].message}`);
        }
        
        const docs = gqlJson?.data?.newsfeedposts?.docs ?? [];
        posts = docs.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          publish_date: d.publish_date,
          status: d.status,
          priority: d.priority,
          created_at: d.createdAt,
          updated_at: d.updatedAt,
        }));
      } else {
        throw new Error(`GraphQL HTTP ${gqlRes.status}`);
      }
    } catch (gqlError) {
      console.error('GraphQL newsfeed query failed:', gqlError);
      
      // Fallback to REST API
      try {
        const restRes = await fetch(`${adminUrl}/api/news?limit=${limit}&page=${page}`);
        if (!restRes.ok) {
          throw new Error(`REST API returned ${restRes.status}`);
        }
        const restJson = await restRes.json();
        const docs = Array.isArray(restJson?.data) ? restJson.data : [];
        posts = docs.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          publish_date: d.publish_date,
          status: d.status,
          priority: d.priority,
          created_at: d.createdAt,
          updated_at: d.updatedAt,
        }));
      } catch (restError) {
        console.error('REST fallback also failed:', restError);
        return res.status(502).json({ error: "Failed to fetch news from both GraphQL and REST" });
      }
    }

    return res.status(200).json({ posts });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}