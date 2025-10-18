import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Supabase server configuration missing' });
    }

    const adminSupabase = createClient(url, serviceKey);

    // Search FAQ items
    const { data: faqItems, error: faqError } = await adminSupabase
      .from('faq_items')
      .select(`
        *,
        faq_categories (
          id,
          name,
          icon
        )
      `)
      .eq('is_active', true)
      .or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`)
      .order('helpful_count', { ascending: false });

    if (faqError) {
      console.error('Error searching FAQ items:', faqError);
    }

    // Search knowledge base articles
    const { data: articles, error: articlesError } = await adminSupabase
      .from('knowledge_base_articles')
      .select('*')
      .eq('is_published', true)
      .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`)
      .order('helpful_count', { ascending: false });

    if (articlesError) {
      console.error('Error searching knowledge base:', articlesError);
    }

    const totalResults = (faqItems?.length || 0) + (articles?.length || 0);

    // Log the search
    if (userId) {
      await adminSupabase
        .from('help_search_logs')
        .insert({
          user_id: userId,
          search_query: searchQuery,
          results_count: totalResults
        });
    }

    return res.status(200).json({
      faqItems: faqItems || [],
      articles: articles || [],
      totalResults
    });
  } catch (err: any) {
    console.error('Help search error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
