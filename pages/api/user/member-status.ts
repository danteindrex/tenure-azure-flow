import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "../../../drizzle/db";
import { userMemberships } from "../../../drizzle/schema/users";
import { userSubscriptions } from "../../../drizzle/schema/financial";
import { eq, desc } from "drizzle-orm";
import { MEMBER_STATUS, SUBSCRIPTION_STATUS } from "../../../src/lib/status-ids";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: new Headers({
        'cookie': req.headers.cookie || ''
      })
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = session.user.id;

    // Get the user's latest membership and subscription status
    const membership = await db
      .select({
        memberStatusId: userMemberships.memberStatusId,
        subscriptionId: userMemberships.subscriptionId,
        createdAt: userMemberships.createdAt
      })
      .from(userMemberships)
      .where(eq(userMemberships.userId, userId))
      .orderBy(desc(userMemberships.createdAt))
      .limit(1);

    if (membership.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          memberStatusId: null,
          memberStatus: 'No Membership',
          subscriptionStatusId: null,
          subscriptionStatus: 'No Subscription',
          canRejoin: true
        }
      });
    }

    const memberData = membership[0];

    // Get subscription status if membership exists
    let subscriptionStatusId = null;
    let cancelAtPeriodEnd = false;
    let currentPeriodEnd = null;
    if (memberData.subscriptionId) {
      const subscription = await db
        .select({
          subscriptionStatusId: userSubscriptions.subscriptionStatusId,
          cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd
        })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.id, memberData.subscriptionId))
        .limit(1);

      if (subscription.length > 0) {
        subscriptionStatusId = subscription[0].subscriptionStatusId;
        cancelAtPeriodEnd = subscription[0].cancelAtPeriodEnd || false;
        currentPeriodEnd = subscription[0].currentPeriodEnd;
      }
    }

    // Determine member status name
    const getStatusName = (statusId: number | null) => {
      if (!statusId) return 'Unknown';
      switch (statusId) {
        case MEMBER_STATUS.INACTIVE: return 'Inactive';
        case MEMBER_STATUS.ACTIVE: return 'Active';
        case MEMBER_STATUS.SUSPENDED: return 'Suspended';
        case MEMBER_STATUS.CANCELLED: return 'Cancelled';
        case MEMBER_STATUS.WON: return 'Won';
        case MEMBER_STATUS.PAID: return 'Paid';
        default: return 'Unknown';
      }
    };

    const getSubscriptionStatusName = (statusId: number | null) => {
      if (!statusId) return 'Unknown';
      switch (statusId) {
        case SUBSCRIPTION_STATUS.ACTIVE: return 'Active';
        case SUBSCRIPTION_STATUS.TRIALING: return 'Trialing';
        case SUBSCRIPTION_STATUS.PAST_DUE: return 'Past Due';
        case SUBSCRIPTION_STATUS.CANCELED: return 'Canceled';
        case SUBSCRIPTION_STATUS.INCOMPLETE: return 'Incomplete';
        case SUBSCRIPTION_STATUS.UNPAID: return 'Unpaid';
        default: return 'Unknown';
      }
    };

    // Determine subscription state
    const isInGracePeriod = cancelAtPeriodEnd && 
                           subscriptionStatusId === SUBSCRIPTION_STATUS.ACTIVE &&
                           currentPeriodEnd && new Date(currentPeriodEnd) > new Date();

    const isFullyCanceled = memberData.memberStatusId === MEMBER_STATUS.CANCELLED || 
                           subscriptionStatusId === SUBSCRIPTION_STATUS.CANCELED;

    const canRejoin = memberData.memberStatusId === MEMBER_STATUS.PAID || isFullyCanceled;
    const canUndoCancel = isInGracePeriod;

    return res.status(200).json({
      success: true,
      data: {
        memberStatusId: memberData.memberStatusId,
        memberStatus: getStatusName(memberData.memberStatusId),
        subscriptionStatusId,
        subscriptionStatus: getSubscriptionStatusName(subscriptionStatusId),
        cancelAtPeriodEnd,
        currentPeriodEnd,
        isInGracePeriod,
        isFullyCanceled,
        canRejoin,
        canUndoCancel
      }
    });

  } catch (error) {
    console.error('Error fetching member status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}