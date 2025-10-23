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
import { FinancialSchedules } from './collections/FinancialSchedules'
import { MemberAgreements } from './collections/MemberAgreements'
import { Members } from './collections/Members'
import { NewsFeedPost } from './collections/NewsFeedPost'
import { Payment } from './collections/Payment'
import { PaymentMethods } from './collections/PaymentMethods'
import { Queue } from './collections/Queue'
import QueueEntries from './collections/QueueEntries'
import { Subscription } from './collections/Subscription'
import { UserAddresses } from './collections/UserAddresses'
import UserAuditLogs from './collections/UserAuditLogs'
import { UserContacts } from './collections/UserContacts'
import { UserMemberships } from './collections/UserMemberships'
import { UserProfiles } from './collections/UserProfiles'
import DashboardMetrics from './components/DashboardMetrics'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admin.slug,
    components: {
      beforeDashboard: [DashboardMetrics],
    },
  },
  collections: [
    Admin,
    AuditLog,
    FinancialSchedules,
    MemberAgreements,
    Members, // Points to 'users' table
    NewsFeedPost,
    Payment, // Points to 'user_payments' table
    PaymentMethods, // Points to 'user_payment_methods' table
    Queue,
    QueueEntries, // Points to 'membership_queue' table
    Subscription, // Points to 'user_subscriptions' table
    UserAddresses, // Points to 'user_addresses' table
    UserAuditLogs, // Points to 'user_audit_logs' table (renamed from system_audit_logs)
    UserContacts, // Points to 'user_contacts' table
    UserMemberships, // Points to 'user_memberships' table
    UserProfiles, // Points to 'user_profiles' table
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
    push: false, // Disable automatic schema push to avoid conflicts
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
