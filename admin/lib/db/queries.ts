import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import { db } from './index';
import {
  adminAccounts,
  adminSessions,
  twoFactorAuth,
  auditLogs,
  users,
  userFunnelStatuses,
  subscriptions,
  transactions,
  payouts,
  membershipQueue,
  billingSchedules,
  adminAlerts,
  userPayments,
  newsfeedPosts,
  type NewAdminAccount,
  type NewAdminSession,
  type NewTwoFactorAuth,
  type NewAuditLog,
  type NewUser,
  type NewSubscription,
  type NewTransaction,
  type NewUserPayment,
  type NewNewsfeedPost,
} from './schema';

// Admin Account Queries
export const adminAccountQueries = {
  findByEmail: async (email: string) => {
    const result = await db.select().from(adminAccounts).where(eq(adminAccounts.email, email)).limit(1);
    return result[0] || null;
  },

  findById: async (id: number) => {
    const result = await db.select().from(adminAccounts).where(eq(adminAccounts.id, id)).limit(1);
    return result[0] || null;
  },

  create: async (data: NewAdminAccount) => {
    const result = await db.insert(adminAccounts).values(data).returning();
    return result[0];
  },

  update: async (id: number, data: Partial<NewAdminAccount>) => {
    const result = await db
      .update(adminAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(adminAccounts.id, id))
      .returning();
    return result[0];
  },

  updateLastLogin: async (id: number) => {
    await db
      .update(adminAccounts)
      .set({ updatedAt: new Date() })
      .where(eq(adminAccounts.id, id));
  },

  getAll: async () => {
    return await db.select().from(adminAccounts).orderBy(desc(adminAccounts.createdAt));
  },

  delete: async (id: number) => {
    await db.delete(adminAccounts).where(eq(adminAccounts.id, id));
  },
};

// Admin Session Queries
export const adminSessionQueries = {
  create: async (data: NewAdminSession) => {
    const result = await db.insert(adminSessions).values(data).returning();
    return result[0];
  },

  findByToken: async (token: string) => {
    const result = await db
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.sessionToken, token))
      .limit(1);
    return result[0] || null;
  },

  findByAdminId: async (adminId: number) => {
    return await db
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.adminId, adminId))
      .orderBy(desc(adminSessions.createdAt));
  },

  delete: async (id: string) => {
    await db.delete(adminSessions).where(eq(adminSessions.id, id));
  },

  deleteByToken: async (token: string) => {
    await db.delete(adminSessions).where(eq(adminSessions.sessionToken, token));
  },

  deleteExpired: async () => {
    await db.delete(adminSessions).where(lte(adminSessions.expiresAt, new Date()));
  },

  getAll: async (limit = 100, offset = 0) => {
    return await db
      .select({
        id: adminSessions.id,
        adminId: adminSessions.adminId,
        adminEmail: adminAccounts.email,
        adminName: adminAccounts.name,
        ipAddress: adminSessions.ipAddress,
        userAgent: adminSessions.userAgent,
        expiresAt: adminSessions.expiresAt,
        createdAt: adminSessions.createdAt,
      })
      .from(adminSessions)
      .leftJoin(adminAccounts, eq(adminSessions.adminId, adminAccounts.id))
      .orderBy(desc(adminSessions.createdAt))
      .limit(limit)
      .offset(offset);
  },

  getStats: async () => {
    const [totalResult] = await db.select({ count: count() }).from(adminSessions);
    const [activeResult] = await db
      .select({ count: count() })
      .from(adminSessions)
      .where(gte(adminSessions.expiresAt, new Date()));

    return {
      total: totalResult.count,
      active: activeResult.count,
    };
  },
};

// Two-Factor Auth Queries
export const twoFactorAuthQueries = {
  create: async (data: NewTwoFactorAuth) => {
    const result = await db.insert(twoFactorAuth).values(data).returning();
    return result[0];
  },

  findLatestByAdminId: async (adminId: number) => {
    const result = await db
      .select()
      .from(twoFactorAuth)
      .where(and(eq(twoFactorAuth.adminId, adminId), eq(twoFactorAuth.used, false)))
      .orderBy(desc(twoFactorAuth.createdAt))
      .limit(1);
    return result[0] || null;
  },

  markAsUsed: async (id: number) => {
    await db.update(twoFactorAuth).set({ used: true }).where(eq(twoFactorAuth.id, id));
  },

  deleteExpired: async () => {
    await db.delete(twoFactorAuth).where(lte(twoFactorAuth.expiresAt, new Date()));
  },
};

// Audit Log Queries
export const auditLogQueries = {
  create: async (data: NewAuditLog) => {
    const result = await db.insert(auditLogs).values(data).returning();
    return result[0];
  },

  getAll: async (limit = 100, offset = 0, filters?: {
    adminId?: number;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    let query = db.select().from(auditLogs);

    if (filters) {
      const conditions = [];
      if (filters.adminId) conditions.push(eq(auditLogs.adminId, filters.adminId));
      if (filters.action) conditions.push(eq(auditLogs.action, filters.action as any));
      if (filters.resource) conditions.push(eq(auditLogs.resource, filters.resource));
      if (filters.startDate) conditions.push(gte(auditLogs.createdAt, filters.startDate));
      if (filters.endDate) conditions.push(lte(auditLogs.createdAt, filters.endDate));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }

    return await query.orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  },

  getStats: async () => {
    const [totalResult] = await db.select({ count: count() }).from(auditLogs);
    return { total: totalResult.count };
  },
};

// User Queries
export const userQueries = {
  findById: async (id: string) => {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        userStatusId: users.userStatusId,
        status: userFunnelStatuses.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        name: users.name,
        image: users.image,
        twoFactorEnabled: users.twoFactorEnabled,
      })
      .from(users)
      .leftJoin(userFunnelStatuses, eq(users.userStatusId, userFunnelStatuses.id))
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  },

  findByEmail: async (email: string) => {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        userStatusId: users.userStatusId,
        status: userFunnelStatuses.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        name: users.name,
        image: users.image,
        twoFactorEnabled: users.twoFactorEnabled,
      })
      .from(users)
      .leftJoin(userFunnelStatuses, eq(users.userStatusId, userFunnelStatuses.id))
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  },

  create: async (data: NewUser) => {
    const result = await db.insert(users).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  },

  update: async (id: string, data: Partial<NewUser>) => {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  },

  getAll: async (limit = 100, offset = 0, filters?: {
    status?: string;
    search?: string;
  }) => {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        userStatusId: users.userStatusId,
        status: userFunnelStatuses.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        name: users.name,
        image: users.image,
        twoFactorEnabled: users.twoFactorEnabled,
      })
      .from(users)
      .leftJoin(userFunnelStatuses, eq(users.userStatusId, userFunnelStatuses.id))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return result;
  },

  getStats: async () => {
    const [totalResult] = await db.select({ count: count() }).from(users);
    const [activeResult] = await db
      .select({ count: count() })
      .from(users)
      .leftJoin(userFunnelStatuses, eq(users.userStatusId, userFunnelStatuses.id))
      .where(eq(userFunnelStatuses.name, 'Active'));

    return {
      total: totalResult.count,
      active: activeResult.count,
    };
  },

  delete: async (id: string) => {
    await db.delete(users).where(eq(users.id, id));
  },
};

// Subscription Queries
export const subscriptionQueries = {
  findById: async (id: string) => {
    const result = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
    return result[0] || null;
  },

  findByUserId: async (userId: string) => {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
  },

  create: async (data: NewSubscription) => {
    const result = await db.insert(subscriptions).values(data).returning();
    return result[0];
  },

  update: async (id: string, data: Partial<NewSubscription>) => {
    const result = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return result[0];
  },

  getAll: async (limit = 100, offset = 0, filters?: {
    status?: string;
    userId?: string;
  }) => {
    let query = db
      .select({
        subscription: subscriptions,
        user: users,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id));

    if (filters?.status) {
      query = query.where(eq(subscriptions.status, filters.status as any)) as any;
    }
    if (filters?.userId) {
      query = query.where(eq(subscriptions.userId, filters.userId)) as any;
    }

    return await query.orderBy(desc(subscriptions.createdAt)).limit(limit).offset(offset);
  },

  getStats: async () => {
    const [totalResult] = await db.select({ count: count() }).from(subscriptions);
    const [activeResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    return {
      total: totalResult.count,
      active: activeResult.count,
    };
  },
};

// Transaction Queries
export const transactionQueries = {
  create: async (data: NewTransaction) => {
    const result = await db.insert(transactions).values(data).returning();
    return result[0];
  },

  getAll: async (limit = 100, offset = 0, filters?: {
    userId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    let query = db
      .select({
        transaction: transactions,
        user: users,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id));

    if (filters) {
      const conditions = [];
      if (filters.userId) conditions.push(eq(transactions.userId, filters.userId));
      if (filters.status) conditions.push(eq(transactions.status, filters.status as any));
      if (filters.startDate) conditions.push(gte(transactions.createdAt, filters.startDate));
      if (filters.endDate) conditions.push(lte(transactions.createdAt, filters.endDate));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }

    return await query.orderBy(desc(transactions.createdAt)).limit(limit).offset(offset);
  },

  getStats: async () => {
    // Get all transactions regardless of status
    const allResult = await db
      .select({
        total: count(),
        totalAmount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
      })
      .from(transactions);
    
    // Also get completed only
    const completedResult = await db
      .select({
        total: count(),
        totalAmount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.status, 'completed'));

    console.log('Transaction Stats:', {
      all: allResult[0],
      completed: completedResult[0]
    });

    // Return all transactions for now to see the total
    return allResult[0];
  },
};

// Payout Queries
export const payoutQueries = {
  getAll: async (limit = 100, offset = 0) => {
    return await db
      .select()
      .from(payouts)
      .orderBy(desc(payouts.createdAt))
      .limit(limit)
      .offset(offset);
  },

  getStats: async () => {
    const result = await db
      .select({
        total: count(),
        totalAmount: sql<number>`COALESCE(SUM(CAST(${payouts.amount} AS DECIMAL)), 0)`,
      })
      .from(payouts)
      .where(eq(payouts.status, 'completed'));

    return result[0];
  },
};

// Membership Queue Queries
export const membershipQueueQueries = {
  getAll: async () => {
    return await db
      .select({
        queue: membershipQueue,
        user: users,
      })
      .from(membershipQueue)
      .leftJoin(users, eq(membershipQueue.userId, users.id))
      .orderBy(membershipQueue.position);
  },
};

// Billing Schedule Queries
export const billingScheduleQueries = {
  getAll: async (limit = 100, offset = 0) => {
    return await db
      .select({
        schedule: billingSchedules,
        user: {
          id: users.id,
          
          email: users.email,
          emailVerified: users.emailVerified,
          userStatusId: users.userStatusId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          name: users.name,
          image: users.image,
          twoFactorEnabled: users.twoFactorEnabled,
        },
      })
      .from(billingSchedules)
      .leftJoin(users, eq(billingSchedules.userId, users.id))
      .orderBy(desc(billingSchedules.createdAt))
      .limit(limit)
      .offset(offset);
  },

  getAllActive: async (limit = 100, offset = 0) => {
    return await db
      .select({
        schedule: billingSchedules,
        user: {
          id: users.id,
          
          email: users.email,
          emailVerified: users.emailVerified,
          userStatusId: users.userStatusId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          name: users.name,
          image: users.image,
          twoFactorEnabled: users.twoFactorEnabled,
        },
      })
      .from(billingSchedules)
      .leftJoin(users, eq(billingSchedules.userId, users.id))
      .where(eq(billingSchedules.isActive, true))
      .orderBy(billingSchedules.nextBillingDate)
      .limit(limit)
      .offset(offset);
  },
};

// Admin Alert Queries
export const adminAlertQueries = {
  getAll: async (limit = 100, offset = 0, unreadOnly = false) => {
    let query = db.select().from(adminAlerts);

    if (unreadOnly) {
      query = query.where(eq(adminAlerts.read, false)) as any;
    }

    return await query.orderBy(desc(adminAlerts.createdAt)).limit(limit).offset(offset);
  },

  markAsRead: async (id: string, readBy: number) => {
    await db
      .update(adminAlerts)
      .set({ read: true, readBy, readAt: new Date() })
      .where(eq(adminAlerts.id, id));
  },

  delete: async (id: string) => {
    await db.delete(adminAlerts).where(eq(adminAlerts.id, id));
  },
};


// User Payment Queries
export const userPaymentQueries = {
  getAll: async (limit = 100, offset = 0, filters?: {
    userId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    let query = db
      .select({
        payment: userPayments,
        user: {
          id: users.id,
          
          email: users.email,
          emailVerified: users.emailVerified,
          userStatusId: users.userStatusId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          name: users.name,
          image: users.image,
          twoFactorEnabled: users.twoFactorEnabled,
        },
      })
      .from(userPayments)
      .leftJoin(users, eq(userPayments.userId, users.id));

    if (filters) {
      const conditions = [];
      if (filters.userId) conditions.push(eq(userPayments.userId, filters.userId));
      if (filters.status) conditions.push(eq(userPayments.status, filters.status));
      if (filters.startDate) conditions.push(gte(userPayments.createdAt, filters.startDate));
      if (filters.endDate) conditions.push(lte(userPayments.createdAt, filters.endDate));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }

    return await query.orderBy(desc(userPayments.createdAt)).limit(limit).offset(offset);
  },

  getStats: async () => {
    const result = await db
      .select({
        total: count(),
        totalAmount: sql<number>`COALESCE(SUM(CAST(${userPayments.amount} AS DECIMAL)), 0)`,
      })
      .from(userPayments);

    return result[0];
  },

  getRevenueByStatus: async (status: string) => {
    const result = await db
      .select({
        total: count(),
        totalAmount: sql<number>`COALESCE(SUM(CAST(${userPayments.amount} AS DECIMAL)), 0)`,
      })
      .from(userPayments)
      .where(eq(userPayments.status, status));

    return result[0];
  },
};

// Newsfeed Post Queries
export const newsfeedPostQueries = {
  getAll: async (limit = 100, offset = 0, publishedOnly = false) => {
    let query = db
      .select({
        post: newsfeedPosts,
        admin: {
          id: adminAccounts.id,
          name: adminAccounts.name,
          email: adminAccounts.email,
        },
      })
      .from(newsfeedPosts)
      .leftJoin(adminAccounts, eq(newsfeedPosts.adminId, adminAccounts.id));

    if (publishedOnly) {
      query = query.where(eq(newsfeedPosts.isPublished, true)) as any;
    }

    return await query.orderBy(desc(newsfeedPosts.createdAt)).limit(limit).offset(offset);
  },

  findById: async (id: string) => {
    const result = await db
      .select({
        post: newsfeedPosts,
        admin: {
          id: adminAccounts.id,
          name: adminAccounts.name,
          email: adminAccounts.email,
        },
      })
      .from(newsfeedPosts)
      .leftJoin(adminAccounts, eq(newsfeedPosts.adminId, adminAccounts.id))
      .where(eq(newsfeedPosts.id, id))
      .limit(1);
    return result[0] || null;
  },

  create: async (data: NewNewsfeedPost) => {
    const result = await db.insert(newsfeedPosts).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  },

  update: async (id: string, data: Partial<NewNewsfeedPost>) => {
    const result = await db
      .update(newsfeedPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newsfeedPosts.id, id))
      .returning();
    return result[0];
  },

  delete: async (id: string) => {
    await db.delete(newsfeedPosts).where(eq(newsfeedPosts.id, id));
  },

  publish: async (id: string) => {
    const result = await db
      .update(newsfeedPosts)
      .set({ isPublished: true, publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(newsfeedPosts.id, id))
      .returning();
    return result[0];
  },

  unpublish: async (id: string) => {
    const result = await db
      .update(newsfeedPosts)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(newsfeedPosts.id, id))
      .returning();
    return result[0];
  },

  getStats: async () => {
    const [totalResult] = await db.select({ count: count() }).from(newsfeedPosts);
    const [publishedResult] = await db
      .select({ count: count() })
      .from(newsfeedPosts)
      .where(eq(newsfeedPosts.isPublished, true));

    return {
      total: totalResult.count,
      published: publishedResult.count,
    };
  },
};
