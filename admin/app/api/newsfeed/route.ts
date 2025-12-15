import { NextRequest, NextResponse } from 'next/server';
import { newsfeedPostQueries } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const publishedOnly = searchParams.get('published') === 'true';

    const offset = (page - 1) * limit;

    const results = await newsfeedPostQueries.getAll(limit, offset, publishedOnly);
    const stats = await newsfeedPostQueries.getStats();

    const posts = results.map(({ post, admin }) => ({
      ...post,
      admin: admin || null,
    }));

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total: stats.total,
        pages: Math.ceil(stats.total / limit),
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
    const body = await request.json();
    const { title, content, imageUrl, isPublished, adminId } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const post = await newsfeedPostQueries.create({
      title,
      content,
      imageUrl: imageUrl || null,
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : null,
      adminId: adminId || null,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating newsfeed post:', error);
    return NextResponse.json(
      { error: 'Failed to create newsfeed post' },
      { status: 500 }
    );
  }
}
