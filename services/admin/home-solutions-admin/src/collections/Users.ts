import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'email_verified', 'total_payments', 'queue_position', 'created_at'],
    description: 'Complete user profiles with financial and queue information',
    group: 'User Management',
    listSearchableFields: ['email', 'status'],
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100]
    },
  },
  access: {
    create: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    read: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    update: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    delete: ({ req: { user } }: { req: { user: User | null } }) => user?.role === 'Super Admin',
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'auth_user_id',
      type: 'text',
      label: 'Auth User ID',
      admin: {
        description: 'Supabase auth user ID',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: 'Email Address',
    },
    {
      name: 'email_verified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Email Verified',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'Pending',
      label: 'User Status',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Suspended', value: 'Suspended' },
        { label: 'Pending', value: 'Pending' },
      ],
    },
    
    // Financial Information (Virtual/Computed Fields)
    {
      name: 'total_payments',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Total amount paid by this user',
        position: 'sidebar',
      },
      hooks: {
        beforeRead: [
          async ({ data, req }) => {
            try {
              const payload = req.payload
              const payments = await payload.find({
                collection: 'user_payments',
                where: { 
                  user_id: { equals: data.id },
                  status: { equals: 'succeeded' }
                },
                limit: 0
              })
              return payments.docs.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
            } catch (error) {
              return 0
            }
          }
        ]
      }
    },
    {
      name: 'payment_count',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Number of successful payments',
        position: 'sidebar',
      },
      hooks: {
        beforeRead: [
          async ({ data, req }) => {
            try {
              const payload = req.payload
              const payments = await payload.count({
                collection: 'user_payments',
                where: { 
                  user_id: { equals: data.id },
                  status: { equals: 'succeeded' }
                }
              })
              return payments.totalDocs
            } catch (error) {
              return 0
            }
          }
        ]
      }
    },
    {
      name: 'queue_position',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Current position in membership queue',
        position: 'sidebar',
      },
      hooks: {
        beforeRead: [
          async ({ data, req }) => {
            try {
              const payload = req.payload
              const queueEntry = await payload.find({
                collection: 'membership_queue',
                where: { user_id: { equals: data.id } },
                limit: 1
              })
              return queueEntry.docs[0]?.position || null
            } catch (error) {
              return null
            }
          }
        ]
      }
    },
    {
      name: 'subscription_status',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Current subscription status',
        position: 'sidebar',
      },
      hooks: {
        beforeRead: [
          async ({ data, req }) => {
            try {
              const payload = req.payload
              const subscription = await payload.find({
                collection: 'user_subscriptions',
                where: { user_id: { equals: data.id } },
                limit: 1,
                sort: '-createdAt'
              })
              return subscription.docs[0]?.status || 'No Subscription'
            } catch (error) {
              return 'Unknown'
            }
          }
        ]
      }
    },
    {
      name: 'kyc_status',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'KYC verification status',
        position: 'sidebar',
      },
      hooks: {
        beforeRead: [
          async ({ data, req }) => {
            try {
              const payload = req.payload
              const kyc = await payload.find({
                collection: 'kyc_verification',
                where: { user_id: { equals: data.id } },
                limit: 1,
                sort: '-createdAt'
              })
              return kyc.docs[0]?.status || 'Not Verified'
            } catch (error) {
              return 'Unknown'
            }
          }
        ]
      }
    },
    {
      name: 'last_payment_date',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Date of last successful payment',
        position: 'sidebar',
      },
      hooks: {
        beforeRead: [
          async ({ data, req }) => {
            try {
              const payload = req.payload
              const payment = await payload.find({
                collection: 'user_payments',
                where: { 
                  user_id: { equals: data.id },
                  status: { equals: 'succeeded' }
                },
                limit: 1,
                sort: '-payment_date'
              })
              return payment.docs[0]?.payment_date || null
            } catch (error) {
              return null
            }
          }
        ]
      }
    },
    
    // User Profile Information Tab
    {
      name: 'profile_info',
      type: 'group',
      label: 'Profile Information',
      fields: [
        {
          name: 'full_name',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Full name from user_profiles table',
          },
          hooks: {
            beforeRead: [
              async ({ data, req }) => {
                try {
                  const payload = req.payload
                  const profile = await payload.find({
                    collection: 'user_profiles',
                    where: { user_id: { equals: data.id } },
                    limit: 1
                  })
                  const p = profile.docs[0]
                  return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Not Provided'
                } catch (error) {
                  return 'Unknown'
                }
              }
            ]
          }
        },
        {
          name: 'phone_number',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Phone number from user_contacts table',
          },
          hooks: {
            beforeRead: [
              async ({ data, req }) => {
                try {
                  const payload = req.payload
                  const contact = await payload.find({
                    collection: 'user_contacts',
                    where: { user_id: { equals: data.id } },
                    limit: 1
                  })
                  return contact.docs[0]?.phone_number || 'Not Provided'
                } catch (error) {
                  return 'Unknown'
                }
              }
            ]
          }
        },
        {
          name: 'address',
          type: 'textarea',
          admin: {
            readOnly: true,
            description: 'Address from user_addresses table',
          },
          hooks: {
            beforeRead: [
              async ({ data, req }) => {
                try {
                  const payload = req.payload
                  const address = await payload.find({
                    collection: 'user_addresses',
                    where: { user_id: { equals: data.id } },
                    limit: 1
                  })
                  const addr = address.docs[0]
                  if (addr) {
                    return `${addr.street_address || ''}\n${addr.city || ''}, ${addr.state || ''} ${addr.postal_code || ''}\n${addr.country || ''}`.trim()
                  }
                  return 'Not Provided'
                } catch (error) {
                  return 'Unknown'
                }
              }
            ]
          }
        }
      ]
    },
    
    // Financial Summary Tab
    {
      name: 'financial_summary',
      type: 'group',
      label: 'Financial Summary',
      fields: [
        {
          name: 'payment_history',
          type: 'textarea',
          admin: {
            readOnly: true,
            description: 'Recent payment history',
          },
          hooks: {
            beforeRead: [
              async ({ data, req }) => {
                try {
                  const payload = req.payload
                  const payments = await payload.find({
                    collection: 'user_payments',
                    where: { user_id: { equals: data.id } },
                    limit: 5,
                    sort: '-payment_date'
                  })
                  return payments.docs.map((p: any) => 
                    `${p.payment_date?.split('T')[0] || 'Unknown'}: $${p.amount || 0} (${p.status || 'unknown'})`
                  ).join('\n') || 'No payments found'
                } catch (error) {
                  return 'Error loading payment history'
                }
              }
            ]
          }
        },
        {
          name: 'subscription_details',
          type: 'textarea',
          admin: {
            readOnly: true,
            description: 'Current subscription information',
          },
          hooks: {
            beforeRead: [
              async ({ data, req }) => {
                try {
                  const payload = req.payload
                  const subscription = await payload.find({
                    collection: 'user_subscriptions',
                    where: { user_id: { equals: data.id } },
                    limit: 1,
                    sort: '-created_at'
                  })
                  const sub = subscription.docs[0]
                  if (sub) {
                    return `Status: ${sub.status || 'unknown'}\nProvider: ${sub.provider || 'unknown'}\nPeriod: ${sub.current_period_start?.split('T')[0] || 'N/A'} to ${sub.current_period_end?.split('T')[0] || 'N/A'}`
                  }
                  return 'No active subscription'
                } catch (error) {
                  return 'Error loading subscription'
                }
              }
            ]
          }
        }
      ]
    },
    
    // Queue Information Tab
    {
      name: 'queue_info',
      type: 'group',
      label: 'Queue Information',
      fields: [
        {
          name: 'queue_details',
          type: 'textarea',
          admin: {
            readOnly: true,
            description: 'Queue position and eligibility details',
          },
          hooks: {
            beforeRead: [
              async ({ data, req }) => {
                try {
                  const payload = req.payload
                  const queueEntry = await payload.find({
                    collection: 'membership_queue',
                    where: { user_id: { equals: data.id } },
                    limit: 1
                  })
                  const entry = queueEntry.docs[0]
                  if (entry) {
                    return `Position: ${entry.position || 'Unknown'}\nStatus: ${entry.status || 'unknown'}\nEligible: ${entry.is_eligible ? 'Yes' : 'No'}\nJoined: ${entry.created_at?.split('T')[0] || 'Unknown'}`
                  }
                  return 'Not in queue'
                } catch (error) {
                  return 'Error loading queue information'
                }
              }
            ]
          }
        }
      ]
    }
  ],
  timestamps: true,
}