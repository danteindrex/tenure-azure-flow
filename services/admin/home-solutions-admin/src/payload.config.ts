// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Admin } from './collections/Admin'
import { AdminAlerts } from './collections/AdminAlerts'
import { AuditLog } from './collections/AuditLog'
import { Disputes } from './collections/Disputes'
import { FinancialSchedules } from './collections/FinancialSchedules'
import { KYCVerification } from './collections/KYCVerification'
import { MemberAgreements } from './collections/MemberAgreements'
import { NewsFeedPost } from './collections/NewsFeedPost'
import { Payment } from './collections/Payment'
import { PaymentMethods } from './collections/PaymentMethods'
import { PayoutManagement } from './collections/PayoutManagement'
import { Queue } from './collections/Queue'
import QueueEntries from './collections/QueueEntries'
import { Subscription } from './collections/Subscription'
import { UserAddresses } from './collections/UserAddresses'
import UserAuditLogs from './collections/UserAuditLogs'
import { UserContacts } from './collections/UserContacts'
import { UserMemberships } from './collections/UserMemberships'
import { UserProfiles } from './collections/UserProfiles'
import { Users } from './collections/Users'
import FinancialDashboard from './components/FinancialDashboard'
import AnalyticsGraphs from './components/AnalyticsGraphs'
import AdminNavigation from './components/AdminNavigation'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admin.slug,
    components: {
      beforeDashboard: [FinancialDashboard, AnalyticsGraphs],
      beforeNavLinks: [AdminNavigation],
    },
    pages: [
      {
        slug: 'user-management',
        label: '👥 User Management',
        Component: () => import('./pages/UserManagement'),
      }
    ],
    locking: false, // Disable document locking to avoid relationship errors
  },
  collections: [
    // Core Admin
    Admin,

    // User Management
    Users, // Enhanced users collection with comprehensive details
    UserProfiles, // Points to 'user_profiles' table
    UserContacts, // Points to 'user_contacts' table
    UserAddresses, // Points to 'user_addresses' table
    UserMemberships, // Points to 'user_memberships' table

    // Payments & Subscriptions
    Payment, // Points to 'user_payments' table
    PaymentMethods, // Points to 'user_payment_methods' table
    Subscription, // Points to 'user_subscriptions' table
    Disputes, // Chargebacks and disputes

    // Queue & Payouts (Feature-flagged)
    Queue,
    QueueEntries, // Points to 'membership_queue' table
    PayoutManagement, // Payout workflow and approvals

    // Compliance & Security (Feature-flagged)
    KYCVerification, // KYC verification tracking
    // TransactionMonitoring, // AML and fraud monitoring - Disabled due to missing related tables
    AuditLog,
    UserAuditLogs, // Points to 'user_audit_logs' table

    // Tax & Legal (Feature-flagged)
    // TaxForms, // W-9, 1099 generation - Disabled due to missing related tables
    MemberAgreements,
    FinancialSchedules,

    // System & Operations (Feature-flagged)
    AdminAlerts, // Alert management
    // ReportTemplates, // Custom reports - Disabled due to missing related tables
    NewsFeedPost,
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
