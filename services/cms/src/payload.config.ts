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
      ssl: { rejectUnauthorized: false }, // Try disabling SSL verification
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
                {
                  name: 'buttonStyle',
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

            // Animated Background Section
            {
              slug: 'animatedBackground',
              labels: {
                singular: 'Animated Background',
                plural: 'Animated Backgrounds',
              },
              fields: [
                {
                  name: 'backgroundType',
                  type: 'select',
                  required: true,
                  defaultValue: 'hexagon',
                  options: [
                    { label: 'Hexagon Pattern', value: 'hexagon' },
                    { label: 'Hole Pattern', value: 'hole' },
                    { label: 'Stars', value: 'stars' },
                    { label: 'Gravity Stars', value: 'gravity-stars' },
                  ],
                },
                { name: 'title', type: 'text' },
                { name: 'subtitle', type: 'textarea' },
                { name: 'overlay', type: 'checkbox', defaultValue: false },
                {
                  name: 'hexagonSettings',
                  type: 'group',
                  admin: {
                    condition: (data) => data?.backgroundType === 'hexagon',
                  },
                  fields: [
                    { name: 'strokeColor', type: 'text', defaultValue: '#3b82f6' },
                    { name: 'numberOfLines', type: 'number', defaultValue: 10 },
                  ],
                },
                {
                  name: 'holeSettings',
                  type: 'group',
                  admin: {
                    condition: (data) => data?.backgroundType === 'hole',
                  },
                  fields: [
                    { name: 'strokeColor', type: 'text', defaultValue: '#3b82f6' },
                    { name: 'numberOfLines', type: 'number', defaultValue: 8 },
                    { name: 'numberOfDiscs', type: 'number', defaultValue: 5 },
                  ],
                },
                {
                  name: 'starsSettings',
                  type: 'group',
                  admin: {
                    condition: (data) => data?.backgroundType === 'stars',
                  },
                  fields: [
                    { name: 'factor', type: 'number', defaultValue: 0.5 },
                    { name: 'speed', type: 'number', defaultValue: 1 },
                    { name: 'starColor', type: 'text', defaultValue: '#ffffff' },
                  ],
                },
                {
                  name: 'gravityStarsSettings',
                  type: 'group',
                  admin: {
                    condition: (data) => data?.backgroundType === 'gravity-stars',
                  },
                  fields: [
                    { name: 'particleCount', type: 'number', defaultValue: 75 },
                    { name: 'particleColor', type: 'text', defaultValue: '#ffffff' },
                  ],
                },
                {
                  name: 'content',
                  type: 'richText',
                },
              ],
            },

            // Interactive Cards Section
            {
              slug: 'interactiveCards',
              labels: {
                singular: 'Interactive Cards Section',
                plural: 'Interactive Cards Sections',
              },
              fields: [
                { name: 'title', type: 'text' },
                { name: 'description', type: 'textarea' },
                {
                  name: 'layout',
                  type: 'select',
                  defaultValue: 'grid',
                  options: [
                    { label: 'Grid', value: 'grid' },
                    { label: 'List', value: 'list' },
                    { label: 'Masonry', value: 'masonry' },
                  ],
                },
                {
                  name: 'cards',
                  type: 'array',
                  fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'description', type: 'textarea' },
                    { name: 'image', type: 'upload', relationTo: 'media' },
                    {
                      name: 'cardType',
                      type: 'select',
                      required: true,
                      defaultValue: 'standard',
                      options: [
                        { label: 'Standard Card', value: 'standard' },
                        { label: 'Preview Card', value: 'preview' },
                        { label: 'Tooltip Card', value: 'tooltip' },
                      ],
                    },
                    { name: 'link', type: 'text' },
                  ],
                },
              ],
            },

            // Animated Content Section
            {
              slug: 'animatedContent',
              labels: {
                singular: 'Animated Content',
                plural: 'Animated Content Sections',
              },
              fields: [
                { name: 'title', type: 'text' },
                {
                  name: 'content',
                  type: 'richText',
                  required: true,
                },
                {
                  name: 'animation',
                  type: 'select',
                  defaultValue: 'fadeIn',
                  options: [
                    { label: 'Fade In', value: 'fadeIn' },
                    { label: 'Slide Up', value: 'slideUp' },
                    { label: 'Slide Left', value: 'slideLeft' },
                    { label: 'Slide Right', value: 'slideRight' },
                    { label: 'Scale In', value: 'scaleIn' },
                  ],
                },
                { name: 'delay', type: 'number', defaultValue: 0 },
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
