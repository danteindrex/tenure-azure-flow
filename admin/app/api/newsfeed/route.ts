import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/newsfeed - Starting...');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const publishedOnly = searchParams.get('published') === 'true';

    let query = supabaseAdmin
      .from('newsfeedposts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data: posts, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Supabase GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch newsfeed posts', details: error.message },
        { status: 500 }
      );
    }

    console.log('GET /api/newsfeed - Found posts:', posts?.length || 0);
    return NextResponse.json({
      posts: posts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching newsfeed posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsfeed posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/newsfeed - Starting...');
    
    // First, let's check the table structure
    console.log('Checking table structure...');
    const { data: existingPosts, error: checkError } = await supabaseAdmin
      .from('newsfeedposts')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('Table check error:', checkError);
    } else {
      console.log('Existing posts sample:', existingPosts);
      if (existingPosts && existingPosts.length > 0) {
        console.log('Table columns:', Object.keys(existingPosts[0]));
      }
    }
    
    const body = await request.json();
    const { title, content, isPublished } = body;
    
    console.log('Request body received:', { title, content, isPublished });

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Try with just the basic required fields first
    const insertData = {
      title,
      content,
    };
    
    console.log('Inserting minimal data to Supabase:', insertData);

    const { data: post, error } = await supabaseAdmin
      .from('newsfeedposts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create newsfeed post', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log('Post created successfully in Supabase:', post);
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/newsfeed:', error);
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


