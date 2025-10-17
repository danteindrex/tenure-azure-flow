import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const NewsFeedPost: CollectionConfig = {
  slug: 'newsfeedpost',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'priority', 'publish_date'],
    description: 'Manage news feed posts and announcements for members',
    group: 'Content',
  },
  access: {
    // Only admins can create/update/delete posts
    create: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    read: ({ req: { user } }: { req: { user: User | null } }) => {
      // Public can read published posts, admins can read all
      if (user) return true
      return {
        status: {
          equals: 'Published',
        },
      }
    },
    update: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    delete: ({ req: { user } }: { req: { user: User | null } }) => !!user,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Post Title',
      maxLength: 200,
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: 'Post Content',
      admin: {
        description: 'Rich text content for the news post',
      },
    },
    {
      name: 'admin_i_d_id',
      type: 'relationship',
      relationTo: 'admin',
      label: 'Author',
      required: true,
      admin: {
        description: 'Admin user who created this post',
      },
    },
    {
      name: 'publish_date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Publish Date',
      admin: {
        description: 'Date and time to publish this post',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'Draft',
      label: 'Post Status',
      options: [
        { label: 'Draft', value: 'Draft' },
        { label: 'Published', value: 'Published' },
        { label: 'Scheduled', value: 'Scheduled' },
        { label: 'Archived', value: 'Archived' },
      ],
      admin: {
        description: 'Current status of the post',
      },
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'Normal',
      label: 'Priority',
      options: [
        { label: 'Low', value: 'Low' },
        { label: 'Normal', value: 'Normal' },
        { label: 'High', value: 'High' },
        { label: 'Urgent', value: 'Urgent' },
      ],
      admin: {
        description: 'Priority level for displaying the post',
      },
    },
  ],
  timestamps: true,
}
