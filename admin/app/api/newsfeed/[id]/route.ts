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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: post, error } = await supabaseAdmin
      .from('newsfeedposts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching newsfeed post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsfeed post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, content, imageUrl, isPublished } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (isPublished !== undefined) {
      updateData.is_published = isPublished;
      if (isPublished) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: post, error } = await supabaseAdmin
      .from('newsfeedposts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update newsfeed post' },
        { status: 500 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating newsfeed post:', error);
    return NextResponse.json(
      { error: 'Failed to update newsfeed post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('newsfeedposts')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to delete newsfeed post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting newsfeed post:', error);
    return NextResponse.json(
      { error: 'Failed to delete newsfeed post' },
      { status: 500 }
    );
  }
}
