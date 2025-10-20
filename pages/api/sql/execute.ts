import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sql } = req.body;

    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    // Execute SQL using the exec_sql function
    const { data, error: execError } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (execError) {
      console.error('SQL execution error:', execError);
      return res.status(500).json({ 
        success: false, 
        error: execError.message 
      });
    }

    return res.status(200).json({
      success: true,
      result: data
    });

  } catch (error) {
    console.error('SQL API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
