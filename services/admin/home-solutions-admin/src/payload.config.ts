// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Admin } from './collections/Admin'
import { AuditLog } from './collections/AuditLog'
import { Company } from './collections/Company'
import { FinancialSchedules } from './collections/FinancialSchedules'
import { MemberAgreements } from './collections/MemberAgreements'
import { Members } from './collections/Members'
import { NewsFeedPost } from './collections/NewsFeedPost'
import { Payment } from './collections/Payment'
import { PaymentMethods } from './collections/PaymentMethods'
import { Queue } from './collections/Queue'
import { QueueEntries } from './collections/QueueEntries'
import { Subscription } from './collections/Subscription'
import { UserAuditLogs } from './collections/UserAuditLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admin.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Admin,
    AuditLog,
    Company,
    FinancialSchedules,
    MemberAgreements,
    Members,
    NewsFeedPost,
    Payment,
    PaymentMethods,
    Queue,
    QueueEntries,
    Subscription,
    UserAuditLogs,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      ssl: {
        rejectUnauthorized: false,
      },
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
