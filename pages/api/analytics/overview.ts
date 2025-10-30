import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users, membershipQueue, userPayments } from "@/drizzle/schema";
import { eq, gte, and } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get current user session using Better Auth
    const session = await auth.api.getSession({ 
      headers: new Headers(req.headers as any)
    });
    
    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { rangeMonths = 12 } = req.query;
    const rangeMonthsNum = parseInt(rangeMonths as string, 10);

    // Resolve current user_id
    let userId: string | null = null;
    const userData = await db.query.users.findFirst({
      where: eq(users.authUserId, session.user.id),
      columns: { id: true }
    });
    if (userData?.id) userId = userData.id as string;

    let tenureMonths = 0;
    if (userId) {
      // Get tenure from membership_queue
      const queueData = await db.query.membershipQueue.findFirst({
        where: eq(membershipQueue.userId, userId),
        columns: { totalMonthsSubscribed: true }
      });
      tenureMonths = queueData?.totalMonthsSubscribed ?? 0;
    }

    // Generate monthly data structure
    const now = new Date();
    const months = [];
    let investedTotal = 0;

    for (let i = rangeMonthsNum - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, invested: 0, earned: 0 });
    }

    if (userId) {
      const fromDate = new Date(now.getFullYear(), now.getMonth() - (rangeMonthsNum - 1), 1);
      const myPayments = await db.query.userPayments.findMany({
        where: and(
          eq(userPayments.userId, userId),
          gte(userPayments.paymentDate, fromDate)
        ),
        columns: {
          amount: true,
          paymentDate: true,
          status: true
        },
        orderBy: userPayments.paymentDate
      });
      
      if (myPayments) {
        for (const p of myPayments) {
          investedTotal += Number(p.amount) || 0;
          const d = new Date(p.paymentDate);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
          const bucket = months.find((m) => m.key === key);
          if (bucket) bucket.invested += Number(p.amount) || 0;
        }
      }
    }

    // Fetch queue to compute position and progress
    let queuePosition = 0;
    let queueCount = 0;
    const queue = await db.query.membershipQueue.findMany({
      columns: {
        userId: true,
        queuePosition: true
      },
      orderBy: membershipQueue.queuePosition
    });
    
    if (queue) {
      queueCount = queue.length;
      if (userId) {
        const row = queue.find((q) => q.userId === userId);
        queuePosition = row?.queuePosition ?? 0;
      }
    }

    // Compute total earned (if payout table unavailable, keep 0)
    const totalEarned = 0;
    const netPosition = totalEarned - investedTotal;

    // Potential payout: approximate as total revenue of all completed payments / 2
    let totalRevenueAll = 0;
    const allPayments = await db.query.userPayments.findMany({
      where: eq(userPayments.status, 'completed'),
      columns: {
        amount: true
      }
    });
    if (allPayments) totalRevenueAll = allPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const potentialPayout = Math.max(totalRevenueAll / 2, 0);

    // Monthly data finalization
    const monthly = months.map((m, idx) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (rangeMonthsNum - 1 - idx), 1);
      if (target > now) target.setMonth(target.getMonth() + 1);
      return {
        month: `${target.toLocaleString("en-US", { month: "short" })} ${target.getFullYear()}`,
        invested: m.invested,
        earned: m.earned
      };
    });

    const overview = {
      tenureMonths,
      investedTotal,
      totalEarned,
      netPosition,
      queuePosition,
      queueCount,
      potentialPayout,
      riskLevel: "Medium", // Default risk level
      nextPayoutDate: getNextPayoutDate()
    };

    return res.status(200).json({
      overview,
      monthly
    });

  } catch (err: unknown) {
    console.error("Analytics API error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}

function getNextPayoutDate(): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (now > target) target.setMonth(target.getMonth() + 1);
  return `${target.toLocaleString("en-US", { month: "long" })} ${target.getFullYear()}`;
}