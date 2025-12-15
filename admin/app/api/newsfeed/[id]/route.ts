import { NextRequest, NextResponse } from 'next/server';
import { newsfeedPostQueries } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await newsfeedPostQueries.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...post.post,
      admin: post.admin || null,
    });
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

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
      if (isPublished && !updateData.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const post = await newsfeedPostQueries.update(params.id, updateData);

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
    await newsfeedPostQueries.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting newsfeed post:', error);
    return NextResponse.json(
      { error: 'Failed to delete newsfeed post' },
      { status: 500 }
    );
  }
}
