import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // Minimal auth for admin access
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Home Solutions CMS',
    },
  },

  // Use your existing database with separate schema
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    schemaName: 'cms', // Isolates all CMS tables
  }),

  editor: lexicalEditor(),

  collections: [
    // Minimal users collection (required for admin)
    {
      slug: 'users',
      auth: true,
      admin: {
        useAsTitle: 'email',
        group: 'Admin',
      },
      access: {
        read: () => true,
        create: () => true,
        update: () => true,
        delete: () => true,
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          defaultValue: 'Admin User',
        },
      ],
    },


    // Posts for newsfeed
    {
      slug: 'posts',
      admin: {
        useAsTitle: 'title',
        group: 'Content',
      },
      access: {
        read: () => true,
        create: () => true,
        update: () => true,
        delete: () => true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          hooks: {
            beforeValidate: [
              ({ value, originalDoc, data }) => {
                if (data?.title && !value) {
                  return data.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
                }
                return value
              },
            ],
          },
        },
        {
          name: 'excerpt',
          type: 'textarea',
          admin: {
            rows: 3,
          },
        },
        {
          name: 'content',
          type: 'richText',
          required: true,
        },
        {
          name: 'featuredImage',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'draft',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ],
        },
        {
          name: 'publishedAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },

    // Pages for homepage builder
    {
      slug: 'pages',
      admin: {
        useAsTitle: 'title',
        group: 'Content',
      },
      access: {
        read: () => true,
        create: () => true,
        update: () => true,
        delete: () => true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
        },
        {
          name: 'layout',
          type: 'blocks',
          blocks: [
            // Hero Section
            {
              slug: 'hero',
              labels: {
                singular: 'Hero Section',
                plural: 'Hero Sections',
              },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'subtitle', type: 'textarea' },
                { name: 'backgroundImage', type: 'upload', relationTo: 'media' },
                {
                  name: 'style',
                  type: 'select',
                  defaultValue: 'centered',
                  options: [
                    { label: 'Centered', value: 'centered' },
                    { label: 'Split Layout', value: 'split' },
                    { label: 'Minimal', value: 'minimal' },
                  ],
                },
                {
                  name: 'buttons',
                  type: 'array',
                  maxRows: 2,
                  fields: [
                    { name: 'text', type: 'text', required: true },
                    { name: 'link', type: 'text', required: true },
                    {
                      name: 'variant',
                      type: 'select',
                      defaultValue: 'primary',
                      options: [
                        { label: 'Primary', value: 'primary' },
                        { label: 'Secondary', value: 'secondary' },
                        { label: 'Outline', value: 'outline' },
                      ],
                    },
                  ],
                },
              ],
            },

            // Features Grid
            {
              slug: 'features',
              labels: {
                singular: 'Features Section',
                plural: 'Features Sections',
              },
              fields: [
                { name: 'title', type: 'text' },
                { name: 'description', type: 'textarea' },
                {
                  name: 'layout',
                  type: 'select',
                  defaultValue: 'grid-3',
                  options: [
                    { label: '2 Columns', value: 'grid-2' },
                    { label: '3 Columns', value: 'grid-3' },
                    { label: '4 Columns', value: 'grid-4' },
                  ],
                },
                {
                  name: 'features',
                  type: 'array',
                  fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'description', type: 'textarea', required: true },
                    {
                      name: 'icon',
                      type: 'select',
                      options: [
                        { label: '⚡ Lightning', value: 'lightning' },
                        { label: '🛡️ Shield', value: 'shield' },
                        { label: '🚀 Rocket', value: 'rocket' },
                        { label: '💎 Diamond', value: 'diamond' },
                        { label: '🎯 Target', value: 'target' },
                        { label: '🔒 Lock', value: 'lock' },
                      ],
                    },
                  ],
                },
              ],
            },

            // CTA Section
            {
              slug: 'cta',
              labels: {
                singular: 'Call to Action',
                plural: 'Call to Actions',
              },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'textarea' },
                { name: 'buttonText', type: 'text', required: true },
                { name: 'buttonLink', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'draft',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ],
        },
      ],
    },

    // Media uploads
    {
      slug: 'media',
      admin: {
        group: 'Media',
      },
      upload: {
        staticURL: '/media',
        staticDir: 'media',
        imageSizes: [
          {
            name: 'thumbnail',
            width: 400,
            height: 300,
            position: 'centre',
          },
          {
            name: 'hero',
            width: 1920,
            height: 1080,
            position: 'centre',
          },
        ],
      },
      access: {
        read: () => true,
        create: () => true,
        update: () => true,
        delete: () => true,
      },
      fields: [
        { name: 'alt', type: 'text' },
        { name: 'caption', type: 'text' },
      ],
    },
  ],

  secret: process.env.PAYLOAD_SECRET || '',
  
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  // CORS for your Next.js app
  cors: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),

  sharp,
  plugins: [],
})
